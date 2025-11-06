# OAuth2 PKCE Implementation Checklist

**Last Updated**: 2025-11-02
**Purpose**: Step-by-step guide to prevent going "off-rail"
**Critical Constraint**: Preserve existing database template - OAuth2 is ADDITIVE, not replacement

---

## ⚠️ **CRITICAL: DO NOT Break Existing Systems**

**Your entire database is built on the existing template. All of these MUST continue working:**
- ✅ CLI authentication (`/auth/cli-login`)
- ✅ VSCode extension (current JWT method)
- ✅ Windsurf IDE (current JWT method)
- ✅ Dashboard (session-based)
- ✅ SDK (API keys)
- ✅ REST API (API keys + JWT)

**OAuth2 PKCE is ADDITIVE**: It adds new endpoints and tables without touching existing ones.

---

## 📋 **Pre-Implementation Checklist**

### **1. Infrastructure Verification** ✅ COMPLETE

- [x] Nginx routes `/oauth/*` to port 4000 ✅
- [x] Nginx routes `/auth/*` to port 4000 ✅
- [x] Health endpoints standardized (`/health` and `/api/v1/health`) ✅
- [x] Port 3005 traffic analyzed (zero usage) ✅
- [x] Database migration created (`002_oauth2_pkce.sql`) ✅
- [x] OAuth clients seeded (`cursor-extension`, `onasis-cli`) ✅

**Verification:**
```bash
# Test nginx routing
curl https://mcp.lanonasis.com/health
curl https://auth.lanonasis.com/health

# Check PM2 services
pm2 list | grep auth-gateway  # Should show 2 instances on port 4000
pm2 list | grep auth          # Port 3005 can be stopped after OAuth deployment

# Verify migration exists
ls -la /opt/lanonasis/onasis-core/services/auth-gateway/migrations/002_oauth2_pkce.sql
```

---

## 📝 **Phase 1: Database Setup** ⏳ NEXT

### **Step 1.1: Review Migration**

- [ ] Read `/opt/lanonasis/onasis-core/services/auth-gateway/migrations/002_oauth2_pkce.sql`
- [ ] Understand the 4 new tables:
  - `oauth_clients` - Registered applications
  - `oauth_authorization_codes` - Short-lived auth codes (5-10 min)
  - `oauth_tokens` - Access + refresh tokens
  - `oauth_audit_log` - Complete audit trail
- [ ] Verify existing tables are NOT modified:
  - `users` - unchanged ✅
  - `sessions` - unchanged ✅
  - `api_keys` - unchanged ✅
  - `audit_log` - unchanged ✅

**Key Point**: Migration is ADDITIVE only. No ALTER TABLE statements on existing tables.

### **Step 1.2: Deploy Migration to Neon Database**

```bash
# Connect to Neon database (auth-gateway database)
psql "postgresql://username:password@ep-xyz.us-west-1.aws.neon.tech/auth_db?sslmode=require"

# Run migration
\i /opt/lanonasis/onasis-core/services/auth-gateway/migrations/002_oauth2_pkce.sql

# Verify tables created
\dt oauth_*

# Expected output:
#              List of relations
#  Schema |           Name            | Type  |  Owner
# --------+---------------------------+-------+----------
#  public | oauth_audit_log           | table | username
#  public | oauth_authorization_codes | table | username
#  public | oauth_clients             | table | username
#  public | oauth_tokens              | table | username

# Verify clients seeded
SELECT client_id, client_name, status FROM oauth_clients;

# Expected output:
#     client_id      |       client_name        | status
# -------------------+--------------------------+--------
#  cursor-extension  | Cursor VSCode Extension  | active
#  onasis-cli        | Onasis CLI Tool          | active
```

**Checklist:**
- [ ] Migration executed successfully
- [ ] 4 new tables exist in database
- [ ] 2 clients seeded (`cursor-extension`, `onasis-cli`)
- [ ] No errors in migration output
- [ ] Existing tables unchanged (verify with `\d users`, `\d sessions`, etc.)

---

## 🔧 **Phase 2: Code Implementation** ⏳ NEXT

### **Location**: `/opt/lanonasis/onasis-core/services/auth-gateway/src/`

This is where you'll implement the OAuth2 PKCE endpoints.

### **Step 2.1: Create PKCE Utility**

**File**: `src/utils/pkce.ts`

```typescript
import crypto from 'crypto';

/**
 * Verify PKCE code challenge
 * @param verifier - Original code_verifier from client
 * @param challenge - code_challenge from authorization request
 * @param method - code_challenge_method (S256 or plain)
 */
export function verifyPKCE(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain'
): boolean {
  if (method === 'plain') {
    return verifier === challenge;
  }

  // S256: SHA256(verifier) base64url-encoded
  const hash = crypto.createHash('sha256').update(verifier).digest();
  const computedChallenge = Buffer.from(hash).toString('base64url');

  return computedChallenge === challenge;
}

/**
 * Generate random authorization code
 */
export function generateAuthorizationCode(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash token before storing in database
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(64).toString('base64url');
}
```

**Checklist:**
- [ ] File created: `src/utils/pkce.ts`
- [ ] All 4 functions implemented
- [ ] TypeScript compilation successful (`npm run build`)

### **Step 2.2: Create OAuth Service**

**File**: `src/services/oauth.service.ts`

This service handles database operations for OAuth2.

```typescript
import { Pool } from 'pg';
import { hashToken } from '../utils/pkce';

export class OAuthService {
  constructor(private pool: Pool) {}

  /**
   * Get OAuth client by client_id
   */
  async getClient(clientId: string) {
    const result = await this.pool.query(
      'SELECT * FROM oauth_clients WHERE client_id = $1 AND status = $2',
      [clientId, 'active']
    );
    return result.rows[0] || null;
  }

  /**
   * Verify redirect URI is allowed for client
   */
  async verifyRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const client = await this.getClient(clientId);
    if (!client) return false;

    const allowedUris = client.allowed_redirect_uris || [];
    return allowedUris.includes(redirectUri);
  }

  /**
   * Store authorization code
   */
  async createAuthorizationCode(data: {
    code: string;
    clientId: string;
    userId: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    redirectUri: string;
    scope: string[];
    state?: string;
    expiresInMinutes?: number;
  }) {
    const codeHash = hashToken(data.code);
    const expiresAt = new Date(Date.now() + (data.expiresInMinutes || 10) * 60 * 1000);

    await this.pool.query(
      `INSERT INTO oauth_authorization_codes
       (code_hash, client_id, user_id, code_challenge, code_challenge_method,
        redirect_uri, scope, state, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        codeHash,
        data.clientId,
        data.userId,
        data.codeChallenge,
        data.codeChallengeMethod,
        data.redirectUri,
        data.scope,
        data.state || null,
        expiresAt
      ]
    );
  }

  /**
   * Get and consume authorization code
   */
  async consumeAuthorizationCode(code: string, clientId: string) {
    const codeHash = hashToken(code);

    const result = await this.pool.query(
      `SELECT * FROM oauth_authorization_codes
       WHERE code_hash = $1 AND client_id = $2 AND consumed = FALSE AND expires_at > NOW()`,
      [codeHash, clientId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const authCode = result.rows[0];

    // Mark as consumed
    await this.pool.query(
      'UPDATE oauth_authorization_codes SET consumed = TRUE, consumed_at = NOW() WHERE id = $1',
      [authCode.id]
    );

    return authCode;
  }

  /**
   * Create access and refresh tokens
   */
  async createTokens(data: {
    accessToken: string;
    refreshToken: string;
    clientId: string;
    userId: string;
    scope: string[];
    accessTokenExpiresInSeconds?: number;
    refreshTokenExpiresInDays?: number;
  }) {
    const accessTokenHash = hashToken(data.accessToken);
    const refreshTokenHash = hashToken(data.refreshToken);
    const accessExpiresAt = new Date(
      Date.now() + (data.accessTokenExpiresInSeconds || 3600) * 1000
    );
    const refreshExpiresAt = new Date(
      Date.now() + (data.refreshTokenExpiresInDays || 30) * 24 * 60 * 60 * 1000
    );

    // Insert access token
    await this.pool.query(
      `INSERT INTO oauth_tokens
       (token_hash, token_type, client_id, user_id, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [accessTokenHash, 'access', data.clientId, data.userId, data.scope, accessExpiresAt]
    );

    // Insert refresh token
    await this.pool.query(
      `INSERT INTO oauth_tokens
       (token_hash, token_type, client_id, user_id, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [refreshTokenHash, 'refresh', data.clientId, data.userId, data.scope, refreshExpiresAt]
    );
  }

  /**
   * Get token by token string
   */
  async getToken(token: string) {
    const tokenHash = hashToken(token);

    const result = await this.pool.query(
      `SELECT * FROM oauth_tokens
       WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string, reason?: string) {
    const tokenHash = hashToken(token);

    await this.pool.query(
      'UPDATE oauth_tokens SET revoked = TRUE, revoked_at = NOW(), revoked_reason = $2 WHERE token_hash = $1',
      [tokenHash, reason || 'user_revoked']
    );
  }

  /**
   * Log OAuth audit event
   */
  async logAudit(data: {
    eventType: string;
    clientId?: string;
    userId?: string;
    success: boolean;
    errorCode?: string;
    errorDescription?: string;
    metadata?: any;
  }) {
    await this.pool.query(
      `INSERT INTO oauth_audit_log
       (event_type, client_id, user_id, success, error_code, error_description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.eventType,
        data.clientId || null,
        data.userId || null,
        data.success,
        data.errorCode || null,
        data.errorDescription || null,
        data.metadata ? JSON.stringify(data.metadata) : '{}'
      ]
    );
  }
}
```

**Checklist:**
- [ ] File created: `src/services/oauth.service.ts`
- [ ] All database methods implemented
- [ ] TypeScript compilation successful

### **Step 2.3: Create OAuth Controller**

**File**: `src/controllers/oauth.controller.ts`

This controller handles OAuth2 HTTP requests.

```typescript
import { Request, Response } from 'express';
import { OAuthService } from '../services/oauth.service';
import { verifyPKCE, generateAuthorizationCode, generateToken } from '../utils/pkce';

export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  /**
   * GET /oauth/authorize
   * Step 1: User authorization request
   */
  async authorize(req: Request, res: Response) {
    try {
      const {
        client_id,
        response_type,
        redirect_uri,
        scope,
        code_challenge,
        code_challenge_method,
        state
      } = req.query;

      // Validate required parameters
      if (!client_id || !redirect_uri || !code_challenge || response_type !== 'code') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing or invalid parameters'
        });
      }

      // Validate client
      const client = await this.oauthService.getClient(client_id as string);
      if (!client) {
        return res.status(400).json({
          error: 'invalid_client',
          error_description: 'Client not found or inactive'
        });
      }

      // Validate redirect URI
      const isValidRedirect = await this.oauthService.verifyRedirectUri(
        client_id as string,
        redirect_uri as string
      );
      if (!isValidRedirect) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Invalid redirect_uri'
        });
      }

      // Check if user is authenticated
      // For now, render a simple login form
      // In production, check session or redirect to login page
      const isAuthenticated = req.session?.userId; // Assuming session middleware

      if (!isAuthenticated) {
        // Render login page with OAuth params preserved
        return res.render('oauth-consent', {
          client_name: client.client_name,
          scope: (scope as string || '').split(' '),
          client_id,
          redirect_uri,
          code_challenge,
          code_challenge_method,
          state
        });
      }

      // User is authenticated - generate authorization code
      const authCode = generateAuthorizationCode();

      await this.oauthService.createAuthorizationCode({
        code: authCode,
        clientId: client_id as string,
        userId: req.session!.userId,
        codeChallenge: code_challenge as string,
        codeChallengeMethod: code_challenge_method as string || 'S256',
        redirectUri: redirect_uri as string,
        scope: (scope as string || '').split(' '),
        state: state as string
      });

      // Log audit event
      await this.oauthService.logAudit({
        eventType: 'authorization_code_issued',
        clientId: client_id as string,
        userId: req.session!.userId,
        success: true
      });

      // Redirect back to client with code
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', authCode);
      if (state) {
        redirectUrl.searchParams.set('state', state as string);
      }

      return res.redirect(redirectUrl.toString());

    } catch (error) {
      console.error('OAuth authorize error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  }

  /**
   * POST /oauth/token
   * Step 2: Token exchange
   */
  async token(req: Request, res: Response) {
    try {
      const { grant_type, client_id } = req.body;

      if (!client_id) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_id is required'
        });
      }

      if (grant_type === 'authorization_code') {
        return this.handleAuthorizationCodeGrant(req, res);
      } else if (grant_type === 'refresh_token') {
        return this.handleRefreshTokenGrant(req, res);
      } else {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: `Grant type '${grant_type}' is not supported`
        });
      }
    } catch (error) {
      console.error('OAuth token error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  }

  /**
   * Handle authorization_code grant
   */
  private async handleAuthorizationCodeGrant(req: Request, res: Response) {
    const { code, redirect_uri, client_id, code_verifier } = req.body;

    if (!code || !redirect_uri || !code_verifier) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
    }

    // Get and consume authorization code
    const authCode = await this.oauthService.consumeAuthorizationCode(code, client_id);

    if (!authCode) {
      await this.oauthService.logAudit({
        eventType: 'token_exchange_failed',
        clientId: client_id,
        success: false,
        errorCode: 'invalid_grant'
      });

      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      });
    }

    // Verify redirect URI matches
    if (authCode.redirect_uri !== redirect_uri) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'redirect_uri mismatch'
      });
    }

    // Verify PKCE
    const isPKCEValid = verifyPKCE(
      code_verifier,
      authCode.code_challenge,
      authCode.code_challenge_method
    );

    if (!isPKCEValid) {
      await this.oauthService.logAudit({
        eventType: 'pkce_verification_failed',
        clientId: client_id,
        userId: authCode.user_id,
        success: false,
        errorCode: 'invalid_grant'
      });

      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'PKCE verification failed'
      });
    }

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    await this.oauthService.createTokens({
      accessToken,
      refreshToken,
      clientId: client_id,
      userId: authCode.user_id,
      scope: authCode.scope
    });

    // Log success
    await this.oauthService.logAudit({
      eventType: 'access_token_issued',
      clientId: client_id,
      userId: authCode.user_id,
      success: true
    });

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: authCode.scope.join(' ')
    });
  }

  /**
   * Handle refresh_token grant
   */
  private async handleRefreshTokenGrant(req: Request, res: Response) {
    const { refresh_token, client_id } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'refresh_token is required'
      });
    }

    // Verify refresh token
    const tokenData = await this.oauthService.getToken(refresh_token);

    if (!tokenData || tokenData.token_type !== 'refresh') {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid or expired refresh token'
      });
    }

    if (tokenData.client_id !== client_id) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Client mismatch'
      });
    }

    // Generate new tokens
    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();

    // Revoke old refresh token
    await this.oauthService.revokeToken(refresh_token, 'token_rotated');

    // Create new tokens
    await this.oauthService.createTokens({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      clientId: client_id,
      userId: tokenData.user_id,
      scope: tokenData.scope
    });

    // Log success
    await this.oauthService.logAudit({
      eventType: 'token_refreshed',
      clientId: client_id,
      userId: tokenData.user_id,
      success: true
    });

    return res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: tokenData.scope.join(' ')
    });
  }

  /**
   * POST /oauth/revoke
   * Revoke access or refresh token
   */
  async revoke(req: Request, res: Response) {
    try {
      const { token, token_type_hint } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token is required'
        });
      }

      await this.oauthService.revokeToken(token, 'user_requested');

      // Log audit event
      await this.oauthService.logAudit({
        eventType: 'token_revoked',
        success: true,
        metadata: { token_type_hint }
      });

      return res.json({ success: true });

    } catch (error) {
      console.error('OAuth revoke error:', error);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Internal server error'
      });
    }
  }
}
```

**Checklist:**
- [ ] File created: `src/controllers/oauth.controller.ts`
- [ ] All 4 methods implemented (authorize, token, handleAuthorizationCodeGrant, handleRefreshTokenGrant, revoke)
- [ ] Error handling in place
- [ ] Audit logging implemented
- [ ] TypeScript compilation successful

### **Step 2.4: Create OAuth Routes**

**File**: `src/routes/oauth.routes.ts`

```typescript
import { Router } from 'express';
import { Pool } from 'pg';
import { OAuthController } from '../controllers/oauth.controller';
import { OAuthService } from '../services/oauth.service';

export function createOAuthRoutes(pool: Pool): Router {
  const router = Router();
  const oauthService = new OAuthService(pool);
  const oauthController = new OAuthController(oauthService);

  // GET /oauth/authorize - Authorization endpoint
  router.get('/authorize', (req, res) => oauthController.authorize(req, res));

  // POST /oauth/token - Token endpoint
  router.post('/token', (req, res) => oauthController.token(req, res));

  // POST /oauth/revoke - Revocation endpoint
  router.post('/revoke', (req, res) => oauthController.revoke(req, res));

  return router;
}
```

**Checklist:**
- [ ] File created: `src/routes/oauth.routes.ts`
- [ ] 3 routes defined
- [ ] TypeScript compilation successful

### **Step 2.5: Register OAuth Routes in Main App**

**File**: `src/index.ts` (or wherever Express app is initialized)

```typescript
import express from 'express';
import { createOAuthRoutes } from './routes/oauth.routes';
import { pool } from './database'; // Your database pool

const app = express();

// ... existing middleware ...

// Register OAuth routes
app.use('/oauth', createOAuthRoutes(pool));

// ... existing routes ...

app.listen(4000, () => {
  console.log('Auth gateway listening on port 4000');
});
```

**Checklist:**
- [ ] OAuth routes registered in main app
- [ ] Mounted at `/oauth` path
- [ ] App compiles successfully
- [ ] Existing routes unchanged

### **Step 2.6: Create OAuth Consent View (Optional)**

**File**: `src/views/oauth-consent.html` (if using template engine)

Simple HTML page for user authorization:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Authorize Application</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 500px;
      margin: 100px auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    h1 { color: #333; }
    .scope-list { margin: 20px 0; }
    .scope-item { padding: 5px 0; }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    button.cancel {
      background: #6c757d;
    }
  </style>
</head>
<body>
  <h1>Authorize {{client_name}}</h1>

  <p>{{client_name}} is requesting access to your account.</p>

  <div class="scope-list">
    <strong>Permissions requested:</strong>
    <ul>
      {{#each scope}}
        <li class="scope-item">{{this}}</li>
      {{/each}}
    </ul>
  </div>

  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="client_id" value="{{client_id}}">
    <input type="hidden" name="redirect_uri" value="{{redirect_uri}}">
    <input type="hidden" name="code_challenge" value="{{code_challenge}}">
    <input type="hidden" name="code_challenge_method" value="{{code_challenge_method}}">
    <input type="hidden" name="state" value="{{state}}">

    <button type="submit" name="consent" value="allow">Allow</button>
    <button type="submit" name="consent" value="deny" class="cancel">Deny</button>
  </form>
</body>
</html>
```

**Checklist:**
- [ ] Consent page created (if needed)
- [ ] Template engine configured
- [ ] POST handler for consent submission

---

## 🧪 **Phase 3: Testing** ⏳ AFTER PHASE 2

### **Step 3.1: Local Testing**

Test OAuth2 flow locally before deploying to VPS.

```bash
# Start auth-gateway locally
cd ~/Onasis-CORE/services/auth-gateway
npm run build
npm start

# Should see:
# ✅ Database connected (Neon)
# ✅ OAuth routes registered
# ✅ Server listening on port 4000
```

**Test Authorization Endpoint:**

```bash
# Test 1: Authorization request
curl "http://localhost:4000/oauth/authorize?client_id=cursor-extension&response_type=code&redirect_uri=http://localhost:8080/callback&scope=memories:read&code_challenge=ABC123&code_challenge_method=S256&state=random"

# Expected: HTML login page or redirect with authorization code
```

**Test PKCE Token Exchange:**

```bash
# Assuming you got authorization code: AUTH_CODE_HERE

# Generate PKCE verifier/challenge for testing:
# verifier: test-verifier-1234567890
# challenge: echo -n "test-verifier-1234567890" | openssl dgst -sha256 -binary | base64url

curl -X POST http://localhost:4000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE_HERE",
    "redirect_uri": "http://localhost:8080/callback",
    "client_id": "cursor-extension",
    "code_verifier": "test-verifier-1234567890"
  }'

# Expected response:
# {
#   "access_token": "...",
#   "refresh_token": "...",
#   "token_type": "Bearer",
#   "expires_in": 3600
# }
```

**Test Token Refresh:**

```bash
curl -X POST http://localhost:4000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "REFRESH_TOKEN_HERE",
    "client_id": "cursor-extension"
  }'

# Expected: New access_token and refresh_token
```

**Test Token Revocation:**

```bash
curl -X POST http://localhost:4000/oauth/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ACCESS_TOKEN_HERE",
    "token_type_hint": "access_token"
  }'

# Expected: { "success": true }
```

**Checklist:**
- [ ] Authorization endpoint returns 200 or redirect
- [ ] Token exchange works with valid PKCE verifier
- [ ] Token exchange fails with invalid verifier (PKCE validation working)
- [ ] Token refresh returns new tokens
- [ ] Token revocation succeeds
- [ ] All audit log entries created in database

### **Step 3.2: Verify Existing Endpoints Still Work**

**CRITICAL**: Test that legacy endpoints are unchanged.

```bash
# Test Legacy JWT Login (port 4000)
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password",
    "client_id": "test-client"
  }'

# Expected: { "access_token": "...", "expires_in": 3600 }

# Test CLI Login (port 4000)
curl -X POST http://localhost:4000/auth/cli-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password"
  }'

# Expected: { "access_token": "...", ... }

# Test MCP Auth (port 4000)
curl -X POST http://localhost:4000/mcp/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password"
  }'

# Expected: { "access_token": "...", ... }

# Test API Key still works (port 3001 - mcp-core)
curl http://localhost:3001/api/v1/tools/list_memories \
  -H "x-api-key: lano_your_test_key"

# Expected: { "memories": [...] }
```

**Checklist:**
- [ ] All legacy endpoints return 200
- [ ] No errors in console logs
- [ ] JWT tokens still work
- [ ] API keys still work
- [ ] Existing clients unaffected

---

## 🚀 **Phase 4: Deployment to VPS** ⏳ AFTER PHASE 3

### **Step 4.1: Git Commit and Push**

```bash
# From local machine: ~/Onasis-CORE/

# Review changes
git status
git diff

# Stage OAuth files
git add services/auth-gateway/src/utils/pkce.ts
git add services/auth-gateway/src/services/oauth.service.ts
git add services/auth-gateway/src/controllers/oauth.controller.ts
git add services/auth-gateway/src/routes/oauth.routes.ts
git add services/auth-gateway/src/index.ts
git add services/auth-gateway/src/views/oauth-consent.html  # if created

# Commit
git commit -m "feat: Add OAuth2 PKCE support

Added OAuth2 Authorization Code with PKCE flow for secure authentication.

FEATURES:
- OAuth2 PKCE authorization endpoint (/oauth/authorize)
- Token exchange endpoint (/oauth/token)
- Token refresh support
- Token revocation endpoint (/oauth/revoke)
- Complete audit logging
- PKCE SHA256 validation

ADDITIVE CHANGES:
- No existing endpoints modified
- All legacy authentication methods preserved
- Database template unchanged (4 new OAuth tables added)

TESTING:
- Full PKCE flow verified locally
- Token refresh working
- Token revocation working
- Legacy endpoints unaffected

Co-authored-by: Claude <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

**Checklist:**
- [ ] All new files committed
- [ ] No accidental changes to existing files
- [ ] Commit message clear and descriptive
- [ ] Pushed to GitHub successfully

### **Step 4.2: Deploy to VPS**

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to repository
cd /opt/lanonasis/onasis-core

# Pull latest code
git fetch origin
git pull origin main

# Navigate to auth-gateway
cd services/auth-gateway

# Install dependencies (if any new ones)
npm install

# Build TypeScript
npm run build

# Check for build errors
echo $?  # Should be 0

# Restart PM2 service
pm2 reload auth-gateway

# Watch logs for startup
pm2 logs auth-gateway --lines 50

# Should see:
# ✅ Database connected
# ✅ OAuth routes registered
# ✅ Server listening on port 4000
```

**Checklist:**
- [ ] Code pulled successfully
- [ ] Dependencies installed
- [ ] TypeScript compilation successful (no errors)
- [ ] PM2 restart successful
- [ ] No errors in PM2 logs
- [ ] Both cluster instances running

### **Step 4.3: Test on VPS**

```bash
# Test OAuth endpoints on VPS

# Test authorization (from VPS or local machine)
curl "https://mcp.lanonasis.com/oauth/authorize?client_id=cursor-extension&response_type=code&redirect_uri=http://localhost:8080/callback&scope=memories:read&code_challenge=ABC123&code_challenge_method=S256&state=random"

# Expected: HTML page or redirect

# Test health endpoints still work
curl https://mcp.lanonasis.com/health
curl https://auth.lanonasis.com/health

# Test legacy endpoints still work
curl -X POST https://mcp.lanonasis.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","client_id":"test"}'

# Should return JWT token (legacy method still works)
```

**Checklist:**
- [ ] OAuth endpoints accessible via HTTPS
- [ ] Health endpoints return 200
- [ ] Legacy JWT login still works
- [ ] No errors in nginx logs (`tail -f /var/log/nginx/error.log`)
- [ ] No errors in PM2 logs (`pm2 logs auth-gateway`)

---

## 📊 **Phase 5: Client Integration** ⏳ AFTER PHASE 4

### **Step 5.1: Update VSCode Extension**

Follow the guide in `CLIENT_INTEGRATION_GUIDE.md` section 1️⃣.

**Checklist:**
- [ ] VSCode extension updated with PKCE flow
- [ ] SecretStorage integration working
- [ ] Browser authentication flow tested
- [ ] Token refresh working
- [ ] Fallback to legacy JWT working

### **Step 5.2: Update CLI Tool**

Follow the guide in `CLIENT_INTEGRATION_GUIDE.md` section 2️⃣.

**Checklist:**
- [ ] CLI updated with PKCE flow
- [ ] `onasis login` opens browser
- [ ] Token stored in `~/.onasis/config.json`
- [ ] `onasis login --legacy` fallback working
- [ ] All CLI commands work with new tokens

### **Step 5.3: Monitor Production**

```bash
# Watch OAuth audit logs in database
psql "postgresql://..." -c "SELECT event_type, client_id, success, created_at FROM oauth_audit_log ORDER BY created_at DESC LIMIT 20;"

# Monitor PM2 metrics
pm2 monit

# Check for any OAuth-related errors
pm2 logs auth-gateway | grep -i oauth
pm2 logs auth-gateway | grep -i error
```

**Checklist:**
- [ ] OAuth audit logs showing successful authorizations
- [ ] No PKCE validation failures
- [ ] Token refresh working in production
- [ ] No increase in error rates
- [ ] Memory usage stable (~90MB per instance)

---

## 🎯 **Phase 6: Cleanup** ⏳ AFTER 7 DAYS OF STABLE OPERATION

### **Step 6.1: Decommission Port 3005 (Legacy Auth)**

After OAuth2 PKCE is proven stable for 7 days:

```bash
# Stop legacy auth service
pm2 stop auth  # ID: 36

# Wait 24 hours, monitor for any issues

# If no issues, delete from PM2
pm2 delete auth

# Save PM2 configuration
pm2 save

# Archive legacy auth code (optional)
tar -czf /opt/archives/auth-legacy-$(date +%Y%m%d).tar.gz /opt/lanonasis/auth/
```

**Checklist:**
- [ ] OAuth2 stable for 7+ days
- [ ] No traffic to port 3005 (verify logs)
- [ ] All clients migrated to OAuth or using port 4000 legacy endpoints
- [ ] Port 3005 service stopped
- [ ] PM2 configuration saved

### **Step 6.2: Update Documentation**

```bash
# Update CLAUDE.md
# Update vps-inventory-20250125.md
# Update agents.md

# Remove port 3005 references
# Mark auth-gateway as sole authentication service
```

**Checklist:**
- [ ] Documentation updated
- [ ] Port mapping guides updated
- [ ] PM2 service list updated
- [ ] README files updated

---

## ✅ **Final Verification Checklist**

Before considering OAuth2 PKCE implementation complete:

### **Infrastructure**
- [ ] Nginx routes all auth traffic to port 4000
- [ ] SSL certificates valid
- [ ] CORS configured correctly
- [ ] Rate limiting in place

### **Database**
- [ ] 4 OAuth tables exist and populated
- [ ] Existing tables unchanged
- [ ] Clients seeded (cursor-extension, onasis-cli)
- [ ] Audit logs working

### **Code**
- [ ] All OAuth endpoints implemented
- [ ] PKCE validation working
- [ ] Token refresh working
- [ ] Token revocation working
- [ ] Error handling comprehensive
- [ ] TypeScript compilation clean

### **Testing**
- [ ] Authorization flow tested end-to-end
- [ ] PKCE challenge/verifier validation verified
- [ ] Token refresh tested
- [ ] Token revocation tested
- [ ] Legacy endpoints still working
- [ ] API keys still working

### **Deployment**
- [ ] Code deployed to VPS
- [ ] PM2 services restarted successfully
- [ ] No errors in logs
- [ ] All health checks passing

### **Clients**
- [ ] VSCode extension using PKCE
- [ ] CLI tool using PKCE
- [ ] Dashboard still working (sessions)
- [ ] SDK still working (API keys)
- [ ] REST API clients working

### **Monitoring**
- [ ] OAuth audit logs populating
- [ ] No error spikes
- [ ] Memory usage stable
- [ ] Response times acceptable

### **Cleanup** (after 7 days)
- [ ] Port 3005 decommissioned
- [ ] Documentation updated
- [ ] PM2 configuration cleaned

---

## 🚨 **Rollback Procedure**

If OAuth2 PKCE causes issues:

```bash
# Rollback steps:

# 1. Revert code changes
cd /opt/lanonasis/onasis-core
git revert <commit-hash-of-oauth-changes>
cd services/auth-gateway
npm run build
pm2 reload auth-gateway

# 2. Clients automatically fall back to legacy JWT

# 3. OAuth tables remain in database (no data loss)

# 4. Monitor logs
pm2 logs auth-gateway

# 5. Fix issues locally, then redeploy
```

---

## 📚 **Reference Documents**

- **Port Mapping**: `PORT_MAPPING_COMPLETE.md`
- **Client Integration**: `CLIENT_INTEGRATION_GUIDE.md`
- **Database Migration**: `002_oauth2_pkce.sql`
- **Implementation Guide**: `OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md`

---

## 🎯 **Success Criteria**

OAuth2 PKCE implementation is considered successful when:

1. ✅ All 4 OAuth endpoints working (authorize, token, refresh, revoke)
2. ✅ PKCE validation preventing unauthorized access
3. ✅ VSCode extension authenticating via browser
4. ✅ CLI tool authenticating via browser
5. ✅ All legacy endpoints still working
6. ✅ Zero increase in error rates
7. ✅ Complete audit trail in database
8. ✅ 7 days of stable operation

---

**Your existing database template is preserved. OAuth2 PKCE is ADDITIVE, not replacement!** 🎉
