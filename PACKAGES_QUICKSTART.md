# 📦 v-secure Packages Quick Reference

**Published NPM Packages** for the LanOnasis v-secure ecosystem.

---

## 🎯 Overview

v-secure provides **4 core packages** that work together to deliver enterprise-grade security:

| Package | Version | Purpose | Install |
|---------|---------|---------|---------|
| **@lanonasis/security-service** | 1.0.0 | Main security service & API | Backend deployment |
| **@lanonasis/oauth-client** | 1.0.1 | OAuth + MCP connectivity | `npm i @lanonasis/oauth-client` |
| **@onasis/security-sdk** | 1.0.0 | Encryption & crypto utilities | `npm i @onasis/security-sdk` |
| **@onasis/privacy-sdk** | 1.0.0 | Data masking & PII protection | `npm i @onasis/privacy-sdk` |

---

## ✅ Your Question Answered

### Q: "How do I use it in other apps? Is it the same API key from the dashboard?"

**YES!** The API key you generate from the v-secure dashboard is your "master key" that unlocks everything:

```bash
# 1. Get your API key from dashboard
https://mcp.lanonasis.com/dashboard → API Keys → Create New Key
# Copy: lano_live_abc123xyz789...

# 2. Use it in any HTTP request
curl https://mcp.lanonasis.com/api/v1/secrets/DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  -H "x-api-key: lano_live_abc123xyz789..."

# 3. Store it in environment variables
echo "VSECURE_API_KEY=lano_live_abc123xyz789..." >> .env
```

**The same API key works with:**
- ✅ REST API calls (via `x-api-key` header)
- ✅ Auth gateway (validates your requests)
- ✅ SDKs and libraries
- ✅ CLI tools
- ✅ Backend services

---

## 📚 Package Details

### 1. @lanonasis/oauth-client

**Purpose:** Drop-in OAuth + MCP connectivity for terminal, desktop, and web apps.

**When to Use:**
- Building CLI tools that need OAuth authentication
- Desktop apps (Electron, Tauri) requiring secure auth
- VSCode/Cursor/Windsurf extensions
- MCP (Model Context Protocol) integrations

**Installation:**
```bash
npm install @lanonasis/oauth-client
# or
bun add @lanonasis/oauth-client
```

**Quick Example:**
```typescript
import { MCPClient } from '@lanonasis/oauth-client';

// Initialize with your OAuth client ID
const client = new MCPClient({
  clientId: 'your_oauth_client_id',
  authBaseUrl: 'https://auth.lanonasis.com',
  mcpEndpoint: 'wss://mcp.lanonasis.com',
  scope: 'mcp:read mcp:write api_keys:manage'
});

// Handles auth, token refresh, and MCP connection
await client.connect();
```

**Terminal OAuth (CLI tools):**
```typescript
import { TerminalOAuthFlow } from '@lanonasis/oauth-client';

const flow = new TerminalOAuthFlow({
  clientId: 'your_client_id',
  authBaseUrl: 'https://auth.lanonasis.com'
});

// Opens browser for authentication
const tokens = await flow.authenticate();
console.log('Access token:', tokens.access_token);
```

**Desktop OAuth (Electron/Tauri):**
```typescript
import { DesktopOAuthFlow } from '@lanonasis/oauth-client';

const flow = new DesktopOAuthFlow({
  clientId: 'your_client_id',
  authBaseUrl: 'https://auth.lanonasis.com'
});

const tokens = await flow.authenticate();
```

**Token Storage (Secure):**
```typescript
import { TokenStorage } from '@lanonasis/oauth-client';

const storage = new TokenStorage();

// Store tokens securely (uses keytar, encrypted files, etc.)
await storage.store(tokens);

// Retrieve later
const tokens = await storage.retrieve();
```

**API Key Storage (Hashed SHA-256):**
```typescript
import { ApiKeyStorage } from '@lanonasis/oauth-client';

const apiKeys = new ApiKeyStorage();

// Store API key (automatically hashes to SHA-256)
await apiKeys.store({
  apiKey: 'lano_live_abc123',
  environment: 'production'
});

// Retrieve hashed key
const hashed = await apiKeys.getApiKey(); // SHA-256 hex digest
```

**Key Features:**
- ✅ OAuth flows for terminal/desktop/web
- ✅ Token lifecycle management (auto-refresh)
- ✅ Secure token storage (Keytar, encrypted files)
- ✅ API key normalization (SHA-256 hashing)
- ✅ MCP WebSocket/SSE connections
- ✅ ESM + CJS bundles with TypeScript types

**GitHub:** https://github.com/lanonasis/v-secure/tree/main/oauth-client

---

### 2. @onasis/security-sdk

**Purpose:** Centralized encryption and cryptography SDK for the entire ecosystem.

**When to Use:**
- Encrypting sensitive data before storing
- Generating secure API keys
- Password hashing and verification
- Key derivation and rotation
- Sanitizing logs (hiding sensitive data)

**Installation:**
```bash
npm install @onasis/security-sdk
# or
bun add @onasis/security-sdk
```

**Quick Example:**
```typescript
import { SecuritySDK } from '@onasis/security-sdk';

// Initialize with master key
const security = new SecuritySDK(process.env.ONASIS_MASTER_KEY);

// Encrypt credentials
const encrypted = security.encrypt(
  { stripe_key: 'sk_live_abc123' },
  'user_123_stripe' // context for key derivation
);

// Store encrypted data in database
await db.insert('credentials', {
  user_id: 123,
  service: 'stripe',
  encrypted: JSON.stringify(encrypted)
});

// Later, decrypt
const decrypted = security.decryptJSON(encrypted, 'user_123_stripe');
console.log(decrypted.stripe_key); // 'sk_live_abc123'
```

**Singleton Pattern:**
```typescript
import { getSecuritySDK } from '@onasis/security-sdk';

const security = getSecuritySDK(); // Uses env var automatically
const encrypted = security.encrypt('sensitive-data', 'context');
```

**Password Hashing:**
```typescript
// Hash password
const hashed = security.hash('user-password');

// Verify password
const isValid = security.verifyHash('user-password', hashed); // true
```

**API Key Generation:**
```typescript
// Generate API key with prefix
const apiKey = security.generateAPIKey('onasis'); // 'onasis_abc123...'

// Generate random token
const token = security.generateToken(32); // 64 hex characters
```

**Data Sanitization (for logs):**
```typescript
// Hide sensitive parts for logging
const sanitized = security.sanitize('sk_live_abc123def456');
// Output: 'sk_l...f456'

console.log(`Using key: ${sanitized}`); // Safe to log
```

**Key Rotation:**
```typescript
// Rotate encryption (generates new key)
const newEncrypted = security.rotate(oldEncrypted, 'user_123_stripe');

// Update in database
await db.update('credentials', { encrypted: newEncrypted });
```

**Generate Master Key:**
```typescript
// Run once to generate master key
const masterKey = SecuritySDK.generateMasterKey();
console.log('ONASIS_MASTER_KEY=' + masterKey);
// Save to .env securely!
```

**Environment Setup:**
```env
# Required: 64-character hex string (32 bytes)
ONASIS_MASTER_KEY=your_64_character_hex_key_here

# Alternative name (backward compatibility)
VSECURE_MASTER_KEY=your_64_character_hex_key_here
```

**Key Features:**
- ✅ AES-256-GCM encryption (authenticated encryption)
- ✅ HKDF & PBKDF2 key derivation
- ✅ Secure password hashing (bcrypt-compatible)
- ✅ API key generation
- ✅ Key rotation support
- ✅ Data sanitization for logging

**Use Cases:**
- MCP Router: Encrypt user credentials for third-party services
- API Gateway: Secure API key storage
- IDE Extensions: Secure token storage
- SDK/CLI: Credential management
- Dashboard: Sensitive data encryption

**GitHub:** https://github.com/lanonasis/security-sdk

---

### 3. @onasis/privacy-sdk

**Purpose:** Privacy utilities and data masking for PII protection.

**When to Use:**
- Masking personally identifiable information (PII)
- Anonymizing user data for analytics
- GDPR/CCPA compliance
- Data redaction for logs
- Pseudonymization

**Installation:**
```bash
npm install @onasis/privacy-sdk
# or
bun add @onasis/privacy-sdk
```

**Quick Example:**
```typescript
import { PrivacySDK } from '@onasis/privacy-sdk';

const privacy = new PrivacySDK();

// Mask email
const masked = privacy.maskEmail('user@example.com');
// Output: 'u***@example.com'

// Mask phone
const maskedPhone = privacy.maskPhone('+1-555-1234');
// Output: '+1-***-1234'

// Mask credit card
const maskedCard = privacy.maskCreditCard('4111-1111-1111-1111');
// Output: '****-****-****-1111'

// Anonymize data
const anonymized = privacy.anonymize({
  email: 'user@example.com',
  phone: '+1-555-1234',
  ssn: '123-45-6789'
});
```

**Key Features:**
- ✅ Email masking
- ✅ Phone number masking
- ✅ Credit card masking
- ✅ SSN/ID masking
- ✅ Data anonymization
- ✅ Pseudonymization
- ✅ PII detection and redaction

**Use Cases:**
- Logging without exposing PII
- Analytics dashboards
- Customer support tools
- Compliance reporting
- Data export for research

**GitHub:** (Coming soon - package published but repo not yet public)

---

### 4. @lanonasis/security-service

**Purpose:** Main backend service providing REST API for secrets, API keys, and access control.

**When to Use:**
- You want to self-host v-secure
- You need the complete security service backend
- You want to customize the security service

**Installation:**
```bash
# Clone the v-secure repo
git clone https://github.com/lanonasis/v-secure.git
cd v-secure

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npm run migrate

# Start service
npm start
```

**API Endpoints:**
```bash
# Create/update secret
POST /api/v1/secrets
{
  "key": "DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  "value": "postgresql://<user>:<password>@<host>:<port>/<db>",
  "tags": ["database", "production"]
}

# Get secret
GET /api/v1/secrets/DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
Header: x-api-key: lano_your_key

# List secrets
GET /api/v1/secrets
Header: x-api-key: lano_your_key

# Create API key
POST /api/v1/api-keys
{
  "name": "Production API Key",
  "access_level": "team",
  "environment": "production"
}

# Rotate API key
POST /api/v1/api-keys/:keyId/rotate
```

**Key Features:**
- ✅ Secret management API
- ✅ API key lifecycle management
- ✅ MCP tool registration
- ✅ Audit logging
- ✅ Access control (RBAC)
- ✅ Encryption at rest (AES-256-GCM)

**See Also:**
- [README.md](./README.md) - Full feature overview
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment
- [ONBOARDING.md](./ONBOARDING.md) - Integration guide

---

## 🔄 Integration Flow

Here's how the packages work together:

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User authenticates via:                                  │
│     @lanonasis/oauth-client                                  │
│     └─> Gets access token                                    │
│                                                               │
│  2. App uses access token OR API key to call:               │
│     @lanonasis/security-service (REST API)                   │
│     └─> Manages secrets and API keys                         │
│                                                               │
│  3. Sensitive data encrypted/decrypted via:                  │
│     @onasis/security-sdk                                     │
│     └─> AES-256-GCM encryption                               │
│                                                               │
│  4. PII data masked/anonymized via:                          │
│     @onasis/privacy-sdk                                      │
│     └─> Safe logging and compliance                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Common Integration Patterns

### Pattern 1: CLI Tool

```typescript
// Use oauth-client for authentication
import { TerminalOAuthFlow } from '@lanonasis/oauth-client';
import { SecuritySDK } from '@onasis/security-sdk';

// 1. Authenticate user
const flow = new TerminalOAuthFlow({
  clientId: 'my-cli',
  authBaseUrl: 'https://auth.lanonasis.com'
});
const tokens = await flow.authenticate();

// 2. Call v-secure API with token
const response = await fetch('https://mcp.lanonasis.com/api/v1/secrets', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`
  }
});

// 3. Encrypt local cache
const security = new SecuritySDK();
const encrypted = security.encrypt(tokens, 'cli_cache');
await fs.writeFile('.cli-cache', JSON.stringify(encrypted));
```

---

### Pattern 2: Backend Service

```typescript
// Use security-sdk + privacy-sdk
import { SecuritySDK } from '@onasis/security-sdk';
import { PrivacySDK } from '@onasis/privacy-sdk';

const security = new SecuritySDK(process.env.ONASIS_MASTER_KEY);
const privacy = new PrivacySDK();

// 1. Encrypt user credentials before storing
app.post('/users/:id/credentials', async (req, res) => {
  const encrypted = security.encrypt(
    { stripe_key: req.body.stripe_key },
    `user_${req.params.id}_stripe`
  );

  await db.insert('user_credentials', {
    user_id: req.params.id,
    service: 'stripe',
    encrypted: JSON.stringify(encrypted)
  });

  // 2. Log with masked data
  console.log(`Stored credentials for ${privacy.maskEmail(req.user.email)}`);

  res.json({ success: true });
});

// 3. Retrieve and decrypt
app.get('/users/:id/credentials/:service', async (req, res) => {
  const row = await db.get(
    'SELECT * FROM user_credentials WHERE user_id = ? AND service = ?',
    [req.params.id, req.params.service]
  );

  const encrypted = JSON.parse(row.encrypted);
  const credentials = security.decryptJSON(
    encrypted,
    `user_${req.params.id}_${req.params.service}`
  );

  res.json(credentials);
});
```

---

### Pattern 3: Desktop App (Electron)

```typescript
// Use oauth-client for desktop OAuth
import { DesktopOAuthFlow, TokenStorage } from '@lanonasis/oauth-client';

const flow = new DesktopOAuthFlow({
  clientId: 'my-desktop-app',
  authBaseUrl: 'https://auth.lanonasis.com'
});

const storage = new TokenStorage();

// 1. Authenticate on first launch
const tokens = await flow.authenticate();
await storage.store(tokens);

// 2. On subsequent launches
const tokens = await storage.retrieve();
if (!tokens || isExpired(tokens)) {
  // Re-authenticate
  const newTokens = await flow.authenticate();
  await storage.store(newTokens);
}

// 3. Use token for API calls
const response = await fetch('https://mcp.lanonasis.com/api/v1/secrets', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`
  }
});
```

---

## 📖 Documentation Links

| Resource | URL |
|----------|-----|
| **Main README** | [README.md](./README.md) |
| **Onboarding Guide** | [ONBOARDING.md](./ONBOARDING.md) |
| **Deployment Guide** | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |
| **OAuth2 PKCE Guide** | [auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md](./auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md) |
| **Security Standards** | [SECURITY_STANDARDS.md](./SECURITY_STANDARDS.md) |
| **API Reference** | [README.md#api-reference](./README.md#api-reference) |

---

## 🆘 Troubleshooting

### "Cannot find module '@lanonasis/oauth-client'"

**Solution:**
```bash
# Check if installed
npm list @lanonasis/oauth-client

# If not found, install
npm install @lanonasis/oauth-client

# If using GitHub Package Registry (GPR)
npm login --registry=https://npm.pkg.github.com
npm install @lanonasis/oauth-client
```

---

### "Invalid API key" when calling v-secure API

**Solution:**
1. Verify API key from dashboard: https://mcp.lanonasis.com/dashboard
2. Check header name: `x-api-key` (lowercase, with hyphen)
3. Ensure key starts with `lano_`
4. Check environment (dev keys don't work in production)

```bash
# Test API key
curl https://mcp.lanonasis.com/api/v1/health \
  -H "x-api-key: lano_your_key_here"
```

---

### "ONASIS_MASTER_KEY not found" with security-sdk

**Solution:**
```bash
# Generate a new master key
node -e "console.log(require('@onasis/security-sdk').SecuritySDK.generateMasterKey())"

# Add to .env
echo "ONASIS_MASTER_KEY=<generated_key>" >> .env

# Or pass directly
import { SecuritySDK } from '@onasis/security-sdk';
const security = new SecuritySDK('your_64_char_hex_key');
```

---

## 💡 Best Practices

### 1. Package Selection

| If you need... | Use this package |
|----------------|------------------|
| OAuth authentication | `@lanonasis/oauth-client` |
| Encrypt/decrypt data | `@onasis/security-sdk` |
| Mask PII in logs | `@onasis/privacy-sdk` |
| Self-hosted API | `@lanonasis/security-service` |

### 2. Environment Variables

```env
# OAuth Client
OAUTH_CLIENT_ID=your_client_id
AUTH_BASE_URL=https://auth.lanonasis.com
MCP_ENDPOINT=wss://mcp.lanonasis.com

# Security SDK
ONASIS_MASTER_KEY=64_character_hex_key_here

# API Access
VSECURE_API_KEY=lano_your_api_key_here
VSECURE_BASE_URL=https://mcp.lanonasis.com
```

### 3. Security Checklist

- ✅ Never commit API keys or master keys to git
- ✅ Use different keys for dev/staging/production
- ✅ Rotate keys every 90 days
- ✅ Use `sanitize()` before logging sensitive data
- ✅ Store tokens securely (use TokenStorage)
- ✅ Validate decrypted data before use
- ✅ Use unique contexts for encryption
- ✅ Enable MFA for dashboard access

---

## 🎓 Next Steps

1. **Install packages you need:**
   ```bash
   npm install @lanonasis/oauth-client @onasis/security-sdk @onasis/privacy-sdk
   ```

2. **Get API key from dashboard:**
   https://mcp.lanonasis.com/dashboard → API Keys

3. **Read the onboarding guide:**
   [ONBOARDING.md](./ONBOARDING.md)

4. **Explore examples:**
   [examples/](./examples/) directory

5. **Join the community:**
   - Discord: https://discord.gg/lanonasis
   - GitHub: https://github.com/lanonasis/v-secure

---

## 📝 Package Versions

| Package | NPM | Status |
|---------|-----|--------|
| `@lanonasis/oauth-client` | 1.0.1 | ✅ Published |
| `@onasis/security-sdk` | 1.0.0 | ✅ Published |
| `@onasis/privacy-sdk` | 1.0.0 | ✅ Published |
| `@lanonasis/security-service` | 1.0.0 | ✅ Production Ready |

---

**Last Updated:** January 2025
**Maintained by:** LanOnasis Security Team
