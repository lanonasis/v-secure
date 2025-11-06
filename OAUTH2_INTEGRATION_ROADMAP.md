# OAuth2 PKCE Integration Roadmap

**Current Status**: Production-ready but not integrated into main package
**Target**: Bring OAuth2 PKCE to the same global standard as core v-secure features
**Version Target**: v1.1.0
**Timeline**: Q1 2024 (estimated 4-6 weeks)

---

## 📊 Current State Assessment

### ✅ What's Complete (Production-Ready)

The OAuth2 PKCE implementation in `auth-gateway-oauth2-pkce/` is **functionally complete**:

- [x] Database schema deployed to Neon (`002_oauth2_pkce.sql`)
- [x] 4 OAuth tables: `oauth_clients`, `oauth_authorization_codes`, `oauth_tokens`, `oauth_audit_log`
- [x] Client seeds: cursor-extension, onasis-cli
- [x] Control room endpoints marked as 'live'
- [x] Nginx routes configured (`/oauth/*` → port 4000)
- [x] Handlers deployed and responding
- [x] Comprehensive implementation documentation

### 🔄 What Needs Work (Integration Gap)

To achieve the same **global standard** as core v-secure features:

1. **Package Structure**: OAuth2 code is separate, not integrated with main codebase
2. **TypeScript Consistency**: Not using same structure as core services
3. **API Consistency**: Not following same patterns as Secret Management and API Key services
4. **Testing**: No test coverage matching core features (80%+ target)
5. **Documentation**: Documentation is separate, needs integration with main docs
6. **Examples**: No usage examples in main examples folder
7. **Type Safety**: Not exporting types through main index.ts
8. **Validation**: Not using Zod schemas like other services

---

## 🎯 Integration Goals

### Primary Objectives

1. **Seamless Integration**: OAuth2 PKCE should feel like a native v-secure feature, not a bolt-on
2. **Consistent API**: Follow same patterns as SecretService and ApiKeyService
3. **Type Safety**: Full TypeScript integration with exported types
4. **Test Coverage**: Match core feature coverage (80%+)
5. **Documentation**: Integrated documentation with same quality as core features
6. **Developer Experience**: Simple, intuitive API matching v-secure standards

### Success Criteria

- [ ] OAuth2Service accessible via `import { OAuth2Service } from './services/oauth2Service'`
- [ ] Type exports in main `index.ts`
- [ ] Zod schemas for all OAuth2 operations
- [ ] REST endpoints following v-secure API conventions
- [ ] Test coverage ≥80%
- [ ] Examples in main examples folder
- [ ] Documentation integrated with ARCHITECTURE.md and README.md
- [ ] Security standards documentation updated

---

## 📋 Integration Plan

### Phase 1: Code Consolidation (Week 1-2)

#### 1.1 Move OAuth2 Code into Main Structure

**Goal**: Integrate OAuth2 into main v-secure codebase structure

**Tasks**:

- [ ] Create `services/oauth2Service.ts` (consolidate from auth-gateway-oauth2-pkce/)
- [ ] Create `types/oauth2.ts` for all OAuth2 types
- [ ] Create `middleware/oauth2.ts` for OAuth2-specific middleware
- [ ] Create `routes/oauth2-*.ts` for OAuth2 endpoints
- [ ] Move database schema to `database/oauth2-pkce-schema.sql`
- [ ] Update migration script to include OAuth2 schema

**File Structure**:
```
v-secure/
├── services/
│   ├── secretService.ts
│   ├── apiKeyService.ts
│   └── oauth2Service.ts          # NEW
├── types/
│   ├── auth.ts
│   └── oauth2.ts                 # NEW
├── middleware/
│   ├── auth.ts
│   └── oauth2.ts                 # NEW
├── routes/
│   ├── api-secrets.ts
│   ├── api-keys.ts
│   ├── mcp-api-keys.ts
│   ├── oauth2-authorize.ts       # NEW
│   ├── oauth2-token.ts           # NEW
│   └── oauth2-manage.ts          # NEW
├── database/
│   ├── schema.sql
│   ├── enterprise-secrets-schema.sql
│   ├── schema-api-keys.sql
│   └── oauth2-pkce-schema.sql    # NEW
```

**Quality Standards**:
- Follow existing code style and conventions
- Use same error handling patterns
- Use same logging patterns
- Match existing service architecture

#### 1.2 TypeScript Type Definitions

**File**: `types/oauth2.ts`

```typescript
import { z } from 'zod';

// OAuth2 Client Types
export interface OAuth2Client {
  id: string;
  client_id: string;
  client_name: string;
  client_type: 'public' | 'confidential';
  allowed_redirect_uris: string[];
  allowed_scopes: string[];
  pkce_required: boolean;
  status: 'active' | 'suspended' | 'deactivated';
  created_at: string;
  updated_at: string;
}

// Authorization Code Types
export interface OAuth2AuthorizationCode {
  id: string;
  code_hash: string;
  client_id: string;
  user_id: string;
  code_challenge: string;
  code_challenge_method: 'S256' | 'plain';
  redirect_uri: string;
  scope: string[];
  state?: string;
  consumed: boolean;
  consumed_at?: string;
  expires_at: string;
  created_at: string;
}

// Token Types
export interface OAuth2Token {
  id: string;
  token_hash: string;
  token_type: 'access' | 'refresh';
  client_id: string;
  user_id: string;
  scope: string[];
  revoked: boolean;
  revoked_at?: string;
  revoked_reason?: string;
  expires_at: string;
  created_at: string;
}

// Request/Response Types
export interface OAuth2AuthorizeRequest {
  client_id: string;
  response_type: 'code';
  redirect_uri: string;
  scope?: string;
  code_challenge: string;
  code_challenge_method: 'S256' | 'plain';
  state?: string;
}

export interface OAuth2TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  refresh_token?: string;
  redirect_uri?: string;
  client_id: string;
  code_verifier?: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

// Zod Schemas
export const OAuth2AuthorizeSchema = z.object({
  client_id: z.string().min(1),
  response_type: z.literal('code'),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  code_challenge: z.string().min(43).max(128), // Base64url encoded SHA256
  code_challenge_method: z.enum(['S256', 'plain']).default('S256'),
  state: z.string().optional()
});

export const OAuth2TokenSchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  code: z.string().optional(),
  refresh_token: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string().min(1),
  code_verifier: z.string().min(43).max(128).optional()
}).refine(
  (data) => {
    if (data.grant_type === 'authorization_code') {
      return !!data.code && !!data.redirect_uri && !!data.code_verifier;
    }
    if (data.grant_type === 'refresh_token') {
      return !!data.refresh_token;
    }
    return false;
  },
  {
    message: 'Invalid parameters for grant_type'
  }
);

export const OAuth2RevokeSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional()
});
```

**Checklist**:
- [ ] All OAuth2 types defined
- [ ] Zod schemas for validation
- [ ] Matches existing type patterns
- [ ] Exported in main `index.ts`

#### 1.3 OAuth2 Service Implementation

**File**: `services/oauth2Service.ts`

Follow the same pattern as `apiKeyService.ts`:
- Class-based service
- Supabase client integration
- Comprehensive error handling
- Zod schema validation
- Full JSDoc comments

**Key Methods**:
```typescript
export class OAuth2Service {
  // Client Management
  async getClient(clientId: string): Promise<OAuth2Client | null>
  async createClient(data: CreateOAuth2ClientInput): Promise<OAuth2Client>
  async updateClient(clientId: string, data: UpdateOAuth2ClientInput): Promise<OAuth2Client>
  async deleteClient(clientId: string): Promise<void>

  // Authorization Flow
  async createAuthorizationCode(data: CreateAuthCodeInput): Promise<string>
  async verifyAuthorizationCode(code: string, clientId: string): Promise<OAuth2AuthorizationCode | null>
  async consumeAuthorizationCode(code: string, clientId: string): Promise<OAuth2AuthorizationCode | null>

  // Token Management
  async createTokenPair(data: CreateTokenInput): Promise<{ accessToken: string; refreshToken: string }>
  async verifyToken(token: string): Promise<OAuth2Token | null>
  async refreshToken(refreshToken: string, clientId: string): Promise<{ accessToken: string; refreshToken: string }>
  async revokeToken(token: string, reason?: string): Promise<void>

  // PKCE Utilities
  verifyPKCE(verifier: string, challenge: string, method: 'S256' | 'plain'): boolean

  // Audit
  async logOAuth2Event(data: OAuth2AuditEvent): Promise<void>
}

// Singleton instance
export const oauth2Service = new OAuth2Service();
```

**Checklist**:
- [ ] Service class created
- [ ] All methods implemented
- [ ] Zod validation on all inputs
- [ ] Error handling consistent with other services
- [ ] JSDoc comments on all public methods
- [ ] Singleton instance exported

#### 1.4 OAuth2 Routes Implementation

**Files**: `routes/oauth2-authorize.ts`, `routes/oauth2-token.ts`, `routes/oauth2-manage.ts`

Follow the same pattern as `routes/api-keys.ts`:
- Express Router
- Swagger/OpenAPI documentation
- Input validation with express-validator
- Consistent error responses
- Authentication middleware where needed

**Example Structure**:
```typescript
// routes/oauth2-authorize.ts
import { Router } from 'express';
import { oauth2Service } from '../services/oauth2Service';
import { OAuth2AuthorizeSchema } from '../types/oauth2';

const router = Router();

/**
 * @swagger
 * /oauth2/authorize:
 *   get:
 *     summary: OAuth2 authorization endpoint
 *     description: Initiates OAuth2 authorization code flow with PKCE
 *     tags: [OAuth2]
 *     parameters:
 *       - name: client_id
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: response_type
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [code]
 *       # ... other parameters
 *     responses:
 *       302:
 *         description: Redirect to client with authorization code
 *       400:
 *         description: Invalid request parameters
 */
router.get('/authorize', async (req, res) => {
  // Implementation
});

export default router;
```

**Checklist**:
- [ ] All OAuth2 routes created
- [ ] Swagger docs for all endpoints
- [ ] Input validation
- [ ] Error handling
- [ ] Consistent with existing route patterns

---

### Phase 2: Testing & Quality (Week 3)

#### 2.1 Unit Tests

**Goal**: Achieve 80%+ test coverage

**Files**: `tests/oauth2Service.test.ts`, `tests/oauth2Routes.test.ts`

**Test Coverage**:
- [ ] OAuth2Service methods
- [ ] PKCE verification logic
- [ ] Token generation and validation
- [ ] Authorization code flow
- [ ] Token refresh flow
- [ ] Token revocation
- [ ] Error cases
- [ ] Edge cases

**Example Test**:
```typescript
describe('OAuth2Service', () => {
  describe('verifyPKCE', () => {
    it('should verify S256 challenge correctly', () => {
      const verifier = 'test-verifier-1234567890';
      const challenge = generateS256Challenge(verifier);

      const result = oauth2Service.verifyPKCE(verifier, challenge, 'S256');

      expect(result).toBe(true);
    });

    it('should reject incorrect verifier', () => {
      const verifier = 'test-verifier-1234567890';
      const challenge = generateS256Challenge(verifier);

      const result = oauth2Service.verifyPKCE('wrong-verifier', challenge, 'S256');

      expect(result).toBe(false);
    });
  });
});
```

#### 2.2 Integration Tests

**Goal**: Test full OAuth2 flow end-to-end

**Test Scenarios**:
- [ ] Complete authorization code flow
- [ ] Token refresh flow
- [ ] Token revocation
- [ ] Client authentication
- [ ] PKCE validation
- [ ] Error handling
- [ ] Concurrent requests

#### 2.3 Security Tests

**Goal**: Verify security measures

**Test Scenarios**:
- [ ] PKCE challenge tampering
- [ ] Authorization code replay attacks
- [ ] Token hijacking attempts
- [ ] Invalid client_id
- [ ] Mismatched redirect_uri
- [ ] Expired code handling
- [ ] Expired token handling

---

### Phase 3: Documentation (Week 3-4)

#### 3.1 Update Main README

**Section to Add**:
```markdown
### 6. OAuth2 Authentication (PKCE)
- **Authorization Flow**: OAuth2 authorization code flow with PKCE
- **Client Types**: Public (mobile, SPA) and confidential (server) clients
- **Token Management**: Access and refresh tokens with automatic rotation
- **Phishing Protection**: PKCE prevents authorization code interception
- **Session Control**: Configurable token lifetimes and revocation
- **Standards Compliant**: RFC 6749, RFC 7636, RFC 8252
```

#### 3.2 Create OAuth2 Guide

**File**: `docs/OAUTH2_GUIDE.md`

**Contents**:
- Overview of OAuth2 PKCE
- Why PKCE is important
- Architecture diagram
- Flow diagrams
- API reference
- Client integration examples
- Security considerations
- Best practices
- Troubleshooting

#### 3.3 Update ARCHITECTURE.md

Add OAuth2 component to architecture diagram and description.

#### 3.4 Update SECURITY_STANDARDS.md

Add OAuth2 PKCE compliance information:
- RFC 6749 (OAuth 2.0)
- RFC 7636 (PKCE)
- RFC 8252 (OAuth 2.0 for Native Apps)
- OWASP OAuth security best practices

#### 3.5 Create Usage Examples

**File**: `examples/oauth2-usage.ts`

```typescript
import { OAuth2Service } from '../services/oauth2Service';

const oauth2Service = new OAuth2Service();

// Example 1: Register OAuth2 client
const client = await oauth2Service.createClient({
  client_name: 'My Mobile App',
  client_type: 'public',
  allowed_redirect_uris: ['myapp://oauth/callback'],
  allowed_scopes: ['memories:read', 'memories:write'],
  pkce_required: true
});

// Example 2: Authorization flow (server-side)
app.get('/oauth/authorize', async (req, res) => {
  const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;

  // Verify client and generate code
  const authCode = await oauth2Service.createAuthorizationCode({
    clientId: client_id,
    userId: req.user.id,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
    redirectUri: redirect_uri,
    scope: ['memories:read'],
    state
  });

  // Redirect with code
  res.redirect(`${redirect_uri}?code=${authCode}&state=${state}`);
});

// Example 3: Token exchange
app.post('/oauth/token', async (req, res) => {
  const { grant_type, code, code_verifier, client_id, redirect_uri } = req.body;

  if (grant_type === 'authorization_code') {
    // Verify and consume authorization code
    const authCodeData = await oauth2Service.consumeAuthorizationCode(code, client_id);

    if (!authCodeData) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Verify PKCE
    const isPKCEValid = oauth2Service.verifyPKCE(
      code_verifier,
      authCodeData.code_challenge,
      authCodeData.code_challenge_method
    );

    if (!isPKCEValid) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await oauth2Service.createTokenPair({
      clientId: client_id,
      userId: authCodeData.user_id,
      scope: authCodeData.scope
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  }
});

// Example 4: Token refresh
app.post('/oauth/token', async (req, res) => {
  const { grant_type, refresh_token, client_id } = req.body;

  if (grant_type === 'refresh_token') {
    const { accessToken, refreshToken: newRefreshToken } =
      await oauth2Service.refreshToken(refresh_token, client_id);

    res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  }
});

// Example 5: Token revocation
app.post('/oauth/revoke', async (req, res) => {
  const { token } = req.body;

  await oauth2Service.revokeToken(token, 'user_requested');

  res.json({ success: true });
});
```

---

### Phase 4: Client Integration Examples (Week 4-5)

#### 4.1 Create Client Integration Guide

**File**: `docs/OAUTH2_CLIENT_INTEGRATION.md`

**Examples for**:
- Node.js server applications
- React/Vue/Angular SPAs
- Mobile apps (React Native, Flutter)
- Desktop apps (Electron, Tauri)
- CLI applications
- VS Code extensions
- Browser extensions

#### 4.2 Create Reference Implementations

**Files**:
- `examples/clients/nodejs-oauth2.ts`
- `examples/clients/react-oauth2.tsx`
- `examples/clients/cli-oauth2.ts`
- `examples/clients/vscode-oauth2.ts`

---

### Phase 5: Package Updates (Week 5)

#### 5.1 Update package.json

**Add OAuth2-related fields**:
```json
{
  "name": "@lanonasis/v-secure",
  "version": "1.1.0",
  "description": "Enterprise-grade security service with OAuth2 PKCE, secret management, and API key lifecycle",
  "keywords": [
    "security",
    "secrets",
    "oauth2",
    "pkce",
    "authentication",
    "authorization"
  ]
}
```

#### 5.2 Update Main Index Exports

**File**: `index.ts`

```typescript
// OAuth2 Service
export { OAuth2Service, oauth2Service } from './services/oauth2Service';

// OAuth2 Types
export type {
  OAuth2Client,
  OAuth2AuthorizationCode,
  OAuth2Token,
  OAuth2AuthorizeRequest,
  OAuth2TokenRequest,
  OAuth2TokenResponse
} from './types/oauth2';

// OAuth2 Schemas
export {
  OAuth2AuthorizeSchema,
  OAuth2TokenSchema,
  OAuth2RevokeSchema
} from './types/oauth2';
```

#### 5.3 Update CHANGELOG.md

**Add v1.1.0 section**:
```markdown
## [1.1.0] - 2024-02-XX

### ✨ Added

#### OAuth2 Authorization with PKCE
- Complete OAuth2 authorization code flow with PKCE (RFC 7636)
- Support for public and confidential clients
- Access and refresh token management
- Token rotation and revocation
- PKCE protection against authorization code interception
- Complete audit logging for OAuth2 events
- Client registration and management
- Standards-compliant implementation (RFC 6749, RFC 7636, RFC 8252)

#### New Services
- `OAuth2Service` - Complete OAuth2 PKCE implementation
- Client CRUD operations
- Authorization code generation and validation
- Token lifecycle management
- PKCE verification utilities

#### New API Endpoints
- `GET /oauth2/authorize` - Authorization endpoint
- `POST /oauth2/token` - Token endpoint (authorization_code and refresh_token grants)
- `POST /oauth2/revoke` - Token revocation endpoint
- `POST /api/v1/oauth2/clients` - Client registration (admin)
- `GET /api/v1/oauth2/clients` - List clients (admin)

#### Documentation
- Complete OAuth2 PKCE guide
- Client integration examples for 6+ platforms
- Security best practices for OAuth2
- Flow diagrams and architecture updates

### 🔒 Security
- PKCE prevents authorization code interception attacks
- Token rotation on refresh
- Configurable token expiration
- Complete audit trail for OAuth2 events
- Client authentication and validation

### 📝 Documentation
- `docs/OAUTH2_GUIDE.md` - Complete OAuth2 implementation guide
- `docs/OAUTH2_CLIENT_INTEGRATION.md` - Client integration examples
- Updated `ARCHITECTURE.md` with OAuth2 components
- Updated `SECURITY_STANDARDS.md` with RFC compliance

### 🧪 Testing
- 80%+ test coverage for OAuth2 service
- Integration tests for complete OAuth2 flow
- Security tests for PKCE and token validation
```

---

### Phase 6: Migration & Deployment (Week 6)

#### 6.1 Database Migration

**Ensure Migration Works Smoothly**:
- [ ] Test migration on local database
- [ ] Verify no breaking changes to existing tables
- [ ] Ensure rollback procedure works
- [ ] Document migration process

#### 6.2 Backwards Compatibility

**Ensure No Breaking Changes**:
- [ ] All existing APIs unchanged
- [ ] JWT auth still works
- [ ] API key auth still works
- [ ] Secret management unchanged
- [ ] API key management unchanged

#### 6.3 Deployment Checklist

- [ ] All tests passing
- [ ] Documentation complete
- [ ] Examples working
- [ ] Type definitions exported
- [ ] CHANGELOG updated
- [ ] README updated
- [ ] Version bumped to 1.1.0
- [ ] Git tagged for release

---

## 📊 Quality Metrics

### Code Quality
- [ ] TypeScript strict mode with no errors
- [ ] ESLint passing with no warnings
- [ ] All functions have JSDoc comments
- [ ] Consistent code style with existing codebase

### Test Coverage
- [ ] Unit tests: ≥80% coverage
- [ ] Integration tests: All critical paths covered
- [ ] Security tests: PKCE and token validation covered

### Documentation Quality
- [ ] All public APIs documented
- [ ] Examples for all use cases
- [ ] Architecture diagrams updated
- [ ] Security considerations documented
- [ ] Troubleshooting guide included

### Performance
- [ ] No performance regression in existing features
- [ ] OAuth2 authorization <100ms
- [ ] Token generation <50ms
- [ ] Token validation <10ms

---

## 🚀 Release Strategy

### Pre-Release Checklist
- [ ] All integration tasks complete
- [ ] Test coverage ≥80%
- [ ] Documentation complete
- [ ] Examples tested
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Release Process
1. **Merge to main**: Merge oauth2-integration branch
2. **Tag release**: `git tag -a v1.1.0 -m "Add OAuth2 PKCE support"`
3. **Push tag**: `git push origin v1.1.0`
4. **Create GitHub Release**: With CHANGELOG content
5. **Update npm**: Publish to npm if packaged
6. **Announce**: Blog post, social media, Discord

### Post-Release
- [ ] Monitor for issues
- [ ] Respond to community feedback
- [ ] Create v1.1.1 patch releases as needed
- [ ] Plan v1.2.0 features

---

## 🔮 Future Enhancements (v1.2.0+)

### OAuth2 Advanced Features
- [ ] Client credentials grant type
- [ ] Device authorization grant (RFC 8628)
- [ ] JWT-secured authorization requests (JAR - RFC 9101)
- [ ] Pushed authorization requests (PAR - RFC 9126)
- [ ] Rich authorization requests (RAR - RFC 9396)
- [ ] OpenID Connect (OIDC) support
- [ ] Dynamic client registration (RFC 7591)
- [ ] Token introspection endpoint (RFC 7662)

### Security Enhancements
- [ ] DPoP (Demonstrating Proof-of-Possession - RFC 9449)
- [ ] Mutual TLS (mTLS) client authentication
- [ ] JWT bearer token authentication
- [ ] Token binding
- [ ] Browser fingerprinting for additional security

### Developer Experience
- [ ] OAuth2 playground/sandbox
- [ ] Interactive flow diagrams
- [ ] Client SDK generators
- [ ] Testing utilities for OAuth2 flows

---

## 📞 Support

For questions during integration:
- **Technical**: Review existing service implementations
- **OAuth2 Spec**: Refer to RFCs 6749, 7636, 8252
- **Security**: Consult OWASP OAuth security cheat sheet

---

## ✅ Definition of Done

OAuth2 PKCE integration is **complete and at global standard** when:

1. ✅ Code structure matches existing services (SecretService, ApiKeyService)
2. ✅ Full TypeScript type safety with exports
3. ✅ Zod validation schemas for all inputs
4. ✅ Test coverage ≥80%
5. ✅ Documentation integrated with main docs
6. ✅ Examples in main examples folder
7. ✅ API endpoints follow v-secure conventions
8. ✅ Security audit passed
9. ✅ No breaking changes to existing features
10. ✅ Performance benchmarks met
11. ✅ CHANGELOG and README updated
12. ✅ Released as v1.1.0

---

**Timeline**: 6 weeks
**Effort**: Medium (existing implementation is solid, mainly integration work)
**Risk**: Low (ADDITIVE changes, no breaking modifications)
**Impact**: High (completes v-secure as comprehensive auth platform)

---

*This roadmap will elevate OAuth2 PKCE from "production-ready" to "global standard" matching the quality and integration of core v-secure features.* 🚀
