# OAuth2 PKCE Implementation Guide
**Date**: 2025-11-02
**Namespace**: `/opt/lanonasis/`
**Service**: `auth-gateway` (port 4000)
**Strategy**: PKCE Primary, Legacy JWT Fallback

---

## 🎯 **Implementation Strategy**

### **Authentication Flow Priority**

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ PRIMARY: OAuth2 PKCE (Secure, Standard)                │
│     ├─ VSCode Extension (SecretStorage)                     │
│     ├─ CLI Tools (Browser-based auth)                       │
│     └─ Third-party integrations                             │
│                                                              │
│  2️⃣ FALLBACK: Legacy JWT (Direct Auth)                     │
│     ├─ Quick internal tools                                 │
│     ├─ Development/testing                                  │
│     └─ Emergency access if OAuth fails                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why PKCE Primary?**
- ✅ Industry standard OAuth2 flow
- ✅ Extension never sees user password
- ✅ Browser-based login (familiar UX)
- ✅ Token stored in VSCode SecretStorage (encrypted)
- ✅ Server-controlled revocation
- ✅ Complete audit trail

**Why Keep Legacy?**
- ✅ Backward compatibility
- ✅ Simpler for internal tools
- ✅ Fallback if PKCE issues arise
- ✅ Testing/development flexibility

---

## 📁 **Service Organization** (Updated 2025-10-31)

### **Canonical Repository Layout**

```
/opt/lanonasis/
├── mcp-core/                          [GIT: lanonasis/mcp-core]
│   ├── dist/index.js                  ✓ PM2: mcp-core (ports 3001/3002/3003)
│   └── quick-auth/
│       └── server.js                  ✓ PM2: auth (port 3005) [LEGACY]
│
├── onasis-core/                       [GIT: thefixer3x/Onasis-CORE]
│   └── services/
│       └── auth-gateway/              ✓ PM2: auth-gateway (port 4000) [PRIMARY]
│           ├── start.js               Entry point (cluster x2)
│           ├── src/
│           │   ├── routes/
│           │   │   ├── auth.routes.ts       (existing)
│           │   │   ├── mcp.routes.ts        (existing)
│           │   │   ├── cli.routes.ts        (existing)
│           │   │   ├── admin.routes.ts      (existing)
│           │   │   └── oauth.routes.ts      ⏳ TO IMPLEMENT
│           │   │
│           │   ├── controllers/
│           │   │   ├── auth.controller.ts   (existing)
│           │   │   ├── mcp.controller.ts    (existing)
│           │   │   └── oauth.controller.ts  ⏳ TO IMPLEMENT
│           │   │
│           │   ├── services/
│           │   │   ├── user.service.ts      (existing)
│           │   │   ├── session.service.ts   (existing)
│           │   │   └── oauth.service.ts     ⏳ TO IMPLEMENT
│           │   │
│           │   ├── utils/
│           │   │   ├── jwt.ts               (existing)
│           │   │   └── pkce.ts              ⏳ TO IMPLEMENT
│           │   │
│           │   └── views/
│           │       └── oauth-consent.html   ⏳ TO IMPLEMENT
│           │
│           ├── migrations/
│           │   ├── 001_init_auth_schema.sql      (existing)
│           │   └── 002_oauth2_pkce.sql           ✅ CREATED
│           │
│           └── config/
│               └── env.ts                   (existing)
│
└── onasis-gateway/                    [GIT: thefixer3x/onasis-gateway]
    └── server.js                      ✓ PM2: onasis (port 3006)
```

### **Service Port Mapping** (Current)

| Port | Service | Mode | Location | Purpose | Status |
|------|---------|------|----------|---------|--------|
| **4000** | auth-gateway | Cluster x2 | `/opt/lanonasis/onasis-core/services/auth-gateway/` | **PRIMARY AUTH** (Neon DB) | ✅ Active |
| **3005** | auth | Cluster x1 | `/opt/lanonasis/mcp-core/quick-auth/` | **LEGACY AUTH** (Supabase) | ⚠️ Deprecated |
| **3001** | mcp-core HTTP | Fork | `/opt/lanonasis/mcp-core/` | MCP HTTP API | ✅ Active |
| **3002** | mcp-core WSS | Fork | `/opt/lanonasis/mcp-core/` | MCP WebSocket | ✅ Active |
| **3003** | mcp-core SSE | Fork | `/opt/lanonasis/mcp-core/` | MCP SSE | ✅ Active |
| **3006** | onasis | Cluster x1 | `/opt/lanonasis/onasis-gateway/` | Credit/Payment Gateway | ✅ Active |

---

## 🔐 **OAuth2 PKCE Architecture**

### **Database Tables** (Migration: 002_oauth2_pkce.sql)

```sql
oauth_clients              -- Registered OAuth2 clients
oauth_authorization_codes  -- Short-lived auth codes (PKCE)
oauth_tokens               -- Access & refresh tokens
oauth_audit_log            -- Complete audit trail
```

**Pre-seeded Clients:**
- `cursor-extension` (VSCode/Cursor, PKCE required)
- `onasis-cli` (CLI tool, PKCE required)

### **OAuth2 Flow Endpoints** (To Implement in auth-gateway)

#### **1. Authorization Endpoint**
```
GET /oauth/authorize
Location: src/routes/oauth.routes.ts
Controller: src/controllers/oauth.controller.ts

Parameters:
  - client_id: string (e.g., "cursor-extension")
  - response_type: "code"
  - redirect_uri: string (must match registered URIs)
  - scope: string (space-separated: "memories:read memories:write")
  - code_challenge: string (SHA256(code_verifier))
  - code_challenge_method: "S256"
  - state: string (CSRF protection)

Flow:
  1. Validate client_id against oauth_clients table
  2. Check redirect_uri is in allowed_redirect_uris
  3. Check if user authenticated (session cookie)
  4. If not authenticated → render login page (oauth-consent.html)
  5. After login → generate authorization code
  6. Store code in oauth_authorization_codes (hashed)
  7. Redirect to: redirect_uri?code=ABC&state=XYZ
  8. Log to oauth_audit_log

Response:
  302 Redirect: {redirect_uri}?code={auth_code}&state={state}
```

#### **2. Token Exchange Endpoint**
```
POST /oauth/token
Location: src/routes/oauth.routes.ts
Controller: src/controllers/oauth.controller.ts

Body (grant_type=authorization_code):
  - grant_type: "authorization_code"
  - code: string (from authorize step)
  - redirect_uri: string (must match original)
  - client_id: string
  - code_verifier: string (PKCE proof)

Flow:
  1. Validate client_id
  2. Find authorization code (hashed lookup)
  3. Verify code not expired (< 10 minutes)
  4. Verify code not consumed
  5. Verify redirect_uri matches
  6. Verify PKCE: SHA256(code_verifier) === code_challenge
  7. Mark code as consumed
  8. Generate access_token & refresh_token (JWT)
  9. Store tokens in oauth_tokens (hashed)
  10. Create session record
  11. Log to oauth_audit_log

Response:
  {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "memories:read memories:write"
  }
```

#### **3. Token Refresh Endpoint**
```
POST /oauth/token
Location: src/routes/oauth.routes.ts
Controller: src/controllers/oauth.controller.ts

Body (grant_type=refresh_token):
  - grant_type: "refresh_token"
  - refresh_token: string
  - client_id: string

Flow:
  1. Validate client_id
  2. Find refresh token (hashed lookup)
  3. Verify token not expired
  4. Verify token not revoked
  5. Generate new access_token & refresh_token
  6. Revoke old refresh_token
  7. Store new tokens in oauth_tokens
  8. Update parent_token_id for rotation tracking
  9. Log to oauth_audit_log

Response:
  {
    "access_token": "new_eyJ...",
    "refresh_token": "new_eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
```

#### **4. Token Revocation Endpoint**
```
POST /oauth/revoke
Location: src/routes/oauth.routes.ts
Controller: src/controllers/oauth.controller.ts

Body:
  - token: string (access or refresh token)
  - token_type_hint: "access_token" | "refresh_token"

Flow:
  1. Find token (hashed lookup)
  2. Mark token as revoked
  3. If refresh token → revoke entire chain (parent_token_id)
  4. Delete associated sessions
  5. Log to oauth_audit_log

Response:
  { "success": true }
```

---

## 🔧 **PKCE Validation Utility** (To Implement)

```typescript
// File: src/utils/pkce.ts

import crypto from 'crypto';

/**
 * Validate PKCE code_verifier against code_challenge
 * @param verifier - Original random string from client
 * @param challenge - SHA256 hash stored during authorization
 * @param method - Should be "S256" (plain not recommended)
 * @returns true if valid
 */
export function validatePKCE(
  verifier: string,
  challenge: string,
  method: string = 'S256'
): boolean {
  if (method !== 'S256') {
    throw new Error('Only S256 code_challenge_method supported');
  }

  // Generate SHA256 hash of verifier
  const hash = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  // Compare with stored challenge
  return hash === challenge;
}

/**
 * Generate authorization code (cryptographically random)
 * @returns Random authorization code (32 bytes, base64url)
 */
export function generateAuthorizationCode(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash token for storage (bcrypt or argon2 recommended)
 * @param token - Token to hash
 * @returns Hashed token
 */
export async function hashToken(token: string): Promise<string> {
  // Use bcrypt or argon2 for production
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token matches hash
 * @param token - Token to verify
 * @param hash - Stored hash
 * @returns true if matches
 */
export async function verifyTokenHash(
  token: string,
  hash: string
): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return tokenHash === hash;
}
```

---

## 🎨 **OAuth Consent Page** (To Implement)

```html
<!-- File: src/views/oauth-consent.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize Access - Lanonasis</title>
    <style>
        /* Add your styling here */
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            width: 100%;
        }
        h1 {
            margin-top: 0;
            color: #333;
        }
        .app-info {
            background: #f7fafc;
            padding: 1rem;
            border-radius: 4px;
            margin: 1rem 0;
        }
        .scopes {
            list-style: none;
            padding: 0;
        }
        .scopes li:before {
            content: "✓ ";
            color: #48bb78;
        }
        button {
            width: 100%;
            padding: 0.75rem;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1rem;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-secondary {
            background: #e2e8f0;
            color: #4a5568;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Authorize Access</h1>

        <div class="app-info">
            <strong>{{client_name}}</strong> wants to access your Lanonasis account.
        </div>

        <p>This application will be able to:</p>
        <ul class="scopes">
            {{#each scopes}}
            <li>{{this}}</li>
            {{/each}}
        </ul>

        <form method="POST" action="/oauth/authorize/consent">
            <input type="hidden" name="client_id" value="{{client_id}}">
            <input type="hidden" name="redirect_uri" value="{{redirect_uri}}">
            <input type="hidden" name="scope" value="{{scope}}">
            <input type="hidden" name="state" value="{{state}}">
            <input type="hidden" name="code_challenge" value="{{code_challenge}}">
            <input type="hidden" name="code_challenge_method" value="{{code_challenge_method}}">

            <button type="submit" class="btn-primary">Authorize</button>
            <button type="button" class="btn-secondary" onclick="window.close()">Cancel</button>
        </form>
    </div>
</body>
</html>
```

---

## 🧪 **Testing Plan**

### **1. Test PKCE Flow End-to-End**

```bash
# Step 1: Generate PKCE challenge locally
code_verifier=$(openssl rand -base64 32 | tr -d '=' | tr '+/' '-_')
code_challenge=$(echo -n $code_verifier | openssl dgst -binary -sha256 | base64 | tr -d '=' | tr '+/' '-_')

# Step 2: Request authorization code
curl "https://mcp.lanonasis.com/oauth/authorize?\
client_id=cursor-extension&\
response_type=code&\
redirect_uri=http://localhost:8080/callback&\
scope=memories:read memories:write&\
code_challenge=$code_challenge&\
code_challenge_method=S256&\
state=random_state_123"

# (Browser opens, user logs in, redirected to callback with code)

# Step 3: Exchange code for tokens
curl -X POST https://mcp.lanonasis.com/oauth/token \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"CODE_FROM_REDIRECT\",
    \"redirect_uri\": \"http://localhost:8080/callback\",
    \"client_id\": \"cursor-extension\",
    \"code_verifier\": \"$code_verifier\"
  }"

# Expected: {"access_token": "...", "refresh_token": "...", ...}
```

### **2. Test Token Refresh**

```bash
curl -X POST https://mcp.lanonasis.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "REFRESH_TOKEN_FROM_STEP_3",
    "client_id": "cursor-extension"
  }'
```

### **3. Test Legacy JWT Fallback**

```bash
# Should still work (fallback)
curl -X POST https://mcp.lanonasis.com/mcp/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "client_id": "quick-test"
  }'
```

---

## 📦 **Deployment Steps**

### **1. Run Database Migration**

```bash
# Connect to Neon database
psql "postgresql://user:pass@host/db?sslmode=require"

# Run OAuth migration
\i /opt/lanonasis/onasis-core/services/auth-gateway/migrations/002_oauth2_pkce.sql

# Verify
SELECT client_id, client_name, status FROM oauth_clients;
# Expected: cursor-extension, onasis-cli
```

### **2. Implement OAuth Code Locally**

```bash
# Clone repo locally
git clone git@github.com:thefixer3x/Onasis-CORE.git
cd Onasis-CORE/services/auth-gateway

# Create OAuth files
touch src/routes/oauth.routes.ts
touch src/controllers/oauth.controller.ts
touch src/services/oauth.service.ts
touch src/utils/pkce.ts
touch src/views/oauth-consent.html

# Implement endpoints (see architecture section above)
# Test locally first
npm run dev
```

### **3. Deploy to VPS**

```bash
# Pull latest code
cd /opt/lanonasis/onasis-core
git pull origin main

# Build
cd services/auth-gateway
npm install
npm run build

# Restart service (cluster x2)
pm2 reload auth-gateway

# Verify
pm2 logs auth-gateway --lines 50
curl https://mcp.lanonasis.com/health
```

### **4. Verify OAuth Endpoints**

```bash
# Test authorization endpoint
curl "https://mcp.lanonasis.com/oauth/authorize?client_id=cursor-extension"

# Should return login page or redirect
```

---

## 🔒 **Security Checklist**

- [ ] PKCE (SHA256) enforced for all public clients
- [ ] Authorization codes expire in 5-10 minutes
- [ ] Codes can only be used once (consumed flag)
- [ ] All tokens hashed before storage (bcrypt/argon2)
- [ ] Rate limiting on OAuth endpoints (10 req/min)
- [ ] CORS properly configured
- [ ] HTTPS enforced (Let's Encrypt)
- [ ] Complete audit logging to oauth_audit_log
- [ ] Redirect URI validation (exact match)
- [ ] State parameter validated (CSRF protection)
- [ ] Scope validation against allowed_scopes
- [ ] Token rotation on refresh (old tokens revoked)
- [ ] IP geolocation logging (optional)
- [ ] Suspicious activity alerts (optional)

---

## 📊 **Monitoring & Observability**

### **Query OAuth Audit Log**

```sql
-- Recent OAuth activity
SELECT
  event_type,
  client_id,
  success,
  error_code,
  created_at
FROM oauth_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- Failed authorization attempts
SELECT
  client_id,
  user_id,
  ip_address,
  error_description,
  created_at
FROM oauth_audit_log
WHERE success = FALSE
  AND event_type IN ('authorize_request', 'token_issued')
ORDER BY created_at DESC;

-- Active tokens by client
SELECT
  client_id,
  COUNT(*) as token_count
FROM oauth_tokens
WHERE revoked = FALSE
  AND expires_at > NOW()
GROUP BY client_id;
```

### **Cleanup Expired Data**

```sql
-- Run periodically (cron job)
SELECT cleanup_expired_oauth_codes();
SELECT cleanup_expired_oauth_tokens();
```

---

## 🎯 **Success Criteria**

- [ ] OAuth2 PKCE flow works end-to-end
- [ ] VSCode extension can authenticate via browser
- [ ] Tokens stored in SecretStorage
- [ ] Token refresh works
- [ ] Token revocation works
- [ ] Legacy JWT fallback still functional
- [ ] All endpoints properly logged
- [ ] No security vulnerabilities
- [ ] Performance acceptable (< 500ms per request)
- [ ] Documentation updated

---

## 📚 **Reference Documentation**

### **VPS Infrastructure**
- Server Inventory: `/opt/lanonasis/vps-inventory-20250125.md`
- PM2 Paths: `/opt/lanonasis/PM2-PATHS-VISUAL.txt`
- Agent Briefing: `/opt/lanonasis/agents.md`

### **Implementation Files**
- OAuth Migration: `/opt/lanonasis/onasis-core/services/auth-gateway/migrations/002_oauth2_pkce.sql`
- Nginx Config: `/etc/nginx/sites-available/mcp.lanonasis.com`
- VPS Prep Summary: `/root/VPS_INFRASTRUCTURE_PREP_COMPLETE.md`

### **PM2 Commands**
```bash
pm2 list                          # All services
pm2 show auth-gateway             # Gateway details
pm2 logs auth-gateway --lines 100 # Logs
pm2 restart auth-gateway          # Restart
pm2 save                          # Save state
```

---

**Implementation Status**: Infrastructure Ready ✅ · Code Implementation Pending ⏳

