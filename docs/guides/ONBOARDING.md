# 🚀 v-secure Onboarding Guide

**Welcome to v-secure!** This guide will help you quickly integrate enterprise-grade security into your applications.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding Authentication Methods](#understanding-authentication-methods)
3. [Getting Your API Key](#getting-your-api-key)
4. [Integration Examples](#integration-examples)
5. [Common Use Cases](#common-use-cases)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

### What is v-secure?

v-secure is an enterprise-grade security service that provides:
- 🔐 **Secret Management**: Store and retrieve encrypted secrets
- 🔑 **API Key Lifecycle Management**: Create, rotate, and revoke API keys
- 🤖 **MCP Integration**: Secure AI tool access with approval workflows
- 📝 **Audit Logging**: Complete compliance-ready audit trails

### 5-Minute Integration

```typescript
// Install the SDK (coming soon) or use the REST API directly
import { LanonasisSecurityClient } from '@lanonasis/security-sdk';

// Initialize with your API key
const security = new LanonasisSecurityClient({
  apiKey: 'lano_your_api_key_here',
  baseUrl: 'https://mcp.lanonasis.com'
});

// Start using it!
await security.createSecret('DATABASE_URL', '<YOUR_VALUE>');
const secret = await security.getSecret('DATABASE_URL');
```

---

## 🔑 Understanding Authentication Methods

v-secure supports **three authentication methods**, each designed for specific use cases:

### 1. **API Keys** (Recommended for Most Apps)

**Best For:**
- ✅ Server-to-server communication
- ✅ Backend services and microservices
- ✅ SDKs and libraries
- ✅ REST API clients
- ✅ CI/CD pipelines
- ✅ Scripts and automation

**How It Works:**
1. Generate an API key from the v-secure dashboard
2. Include it in the `x-api-key` header of your requests
3. The auth gateway validates the key and grants access

**Example:**
```bash
curl https://mcp.lanonasis.com/api/v1/secrets/DATABASE_URL
  -H "x-api-key: lano_your_api_key_here"
```

**Security Level:** ⭐⭐⭐⭐ High (as secure as your key storage)

---

### 2. **OAuth2 PKCE** (For User-Facing Apps)

**Best For:**
- ✅ CLI tools (requiring browser login)
- ✅ Desktop applications (VSCode, Cursor, Windsurf)
- ✅ Mobile apps
- ✅ Single-page applications (SPAs)

**How It Works:**
1. Your app initiates an OAuth2 PKCE flow
2. User authenticates via browser
3. Your app receives an access token
4. Use the token in `Authorization: Bearer <token>` header

**Example:**
```typescript
// 1. Start PKCE flow (opens browser)
const { authUrl, codeVerifier } = await startPKCEFlow({
  clientId: 'your-app',
  redirectUri: 'http://localhost:3000/callback'
});

// 2. After user authenticates, exchange code for token
const tokens = await exchangeCodeForToken(code, codeVerifier);

// 3. Use the access token
const response = await fetch('https://mcp.lanonasis.com/api/v1/secrets', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`
  }
});
```

**Security Level:** ⭐⭐⭐⭐⭐ Highest (user never shares password with app)

---

### 3. **Session Cookies** (For Web Dashboards)

**Best For:**
- ✅ Web dashboards and admin panels
- ✅ Browser-based applications with traditional login
- ✅ Server-side rendered apps (Next.js, Remix, etc.)

**How It Works:**
1. User logs in with email/password
2. Server sets an HttpOnly session cookie
3. Browser automatically includes cookie in requests

**Example:**
```typescript
// Login sets cookie automatically
await fetch('https://mcp.lanonasis.com/web/login', {
  method: 'POST',
  credentials: 'include', // Important!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Subsequent requests automatically authenticated
await fetch('https://mcp.lanonasis.com/api/v1/secrets', {
  credentials: 'include' // Sends cookie
});
```

**Security Level:** ⭐⭐⭐⭐ High (HttpOnly cookies prevent XSS)

---

## 🎫 Getting Your API Key

### Method 1: From the Dashboard (Recommended)

1. **Log in to v-secure Dashboard:**
   ```
   https://mcp.lanonasis.com/dashboard
   ```

2. **Navigate to API Keys:**
   - Click on "API Keys" in the sidebar
   - Click "Create New API Key"

3. **Configure Your Key:**
   ```
   Name: "My Production App"
   Access Level: authenticated | team | admin
   Environment: production | staging | development
   Project: [Select your project]
   Expiration: 90 days (recommended)
   Rotation: Automatic (recommended)
   ```

4. **Copy Your Key:**
   ```
   lano_live_abc123xyz789...
   ```
   ⚠️ **Save it securely!** You'll only see it once.

5. **Store It Safely:**
   - ✅ Environment variables (`.env` file)
   - ✅ Secret manager (AWS Secrets Manager, Azure Key Vault)
   - ✅ CI/CD secrets (GitHub Secrets, GitLab Variables)
   - ❌ NEVER commit to version control
   - ❌ NEVER hardcode in source code

---

### Method 2: Via API (For Automation)

If you already have an API key or session, you can create additional keys programmatically:

```typescript
// POST /api/v1/api-keys
const newKey = await fetch('https://mcp.lanonasis.com/api/v1/api-keys', {
  method: 'POST',
  headers: {
    'x-api-key': 'lano_your_existing_key', // Use existing key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'CI/CD Pipeline Key',
    access_level: 'team',
    environment: 'staging',
    expires_in_days: 90
  })
});

const { api_key, key_id } = await newKey.json();
console.log('New API key:', api_key); // lano_staging_xyz123...
```

---

## 🔗 Integration Examples

### Example 1: Node.js Backend Service

```typescript
// server.ts
import express from 'express';

const app = express();
const VSECURE_API_KEY = process.env.VSECURE_API_KEY; // From dashboard
const VSECURE_BASE_URL = 'https://mcp.lanonasis.com';

// Helper function to call v-secure
async function getSecret(key: string): Promise<string> {
  const response = await fetch(`${VSECURE_BASE_URL}/api/v1/secrets/${key}`, {
    headers: {
      'x-api-key': VSECURE_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get secret: ${response.statusText}`);
  }

  const data = await response.json();
  return data.value;
}

// Use in your app
app.get('/connect-db', async (req, res) => {
  try {
    const dbUrl = await getSecret('DATABASE_URL');
    // Connect to database with dbUrl
    res.json({ status: 'connected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

---

### Example 2: React Frontend (with Backend Proxy)

**⚠️ Important:** Never expose API keys in frontend code! Use a backend proxy.

```typescript
// frontend/src/lib/secrets.ts
export async function getSecret(key: string): Promise<string> {
  // Call YOUR backend, which proxies to v-secure
  const response = await fetch(`/api/secrets/${key}`, {
    credentials: 'include' // Sends session cookie
  });

  if (!response.ok) {
    throw new Error('Failed to get secret');
  }

  const data = await response.json();
  return data.value;
}

// backend/api/secrets/[key].ts (Next.js API route)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  // Verify user session first
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch from v-secure using YOUR API key (stored on server)
  const response = await fetch(
    `https://mcp.lanonasis.com/api/v1/secrets/${params.key}`,
    {
      headers: {
        'x-api-key': process.env.VSECURE_API_KEY! // Server-side only
      }
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

---

### Example 3: Python Script

```python
# secrets_client.py
import requests
import os

class VSecureClient:
    def __init__(self, api_key: str = None, base_url: str = None):
        self.api_key = api_key or os.getenv('VSECURE_API_KEY')
        self.base_url = base_url or 'https://mcp.lanonasis.com'

        if not self.api_key:
            raise ValueError('API key required. Set VSECURE_API_KEY env var.')

    def get_secret(self, key: str) -> str:
        """Retrieve a secret value"""
        response = requests.get(
            f'{self.base_url}/api/v1/secrets/{key}',
            headers={'x-api-key': self.api_key}
        )
        response.raise_for_status()
        return response.json()['value']

    def create_secret(self, key: str, value: str, tags: list = None):
        """Store a new secret"""
        response = requests.post(
            f'{self.base_url}/api/v1/secrets',
            headers={
                'x-api-key': self.api_key,
                'Content-Type': 'application/json'
            },
            json={
                'key': key,
                'value': value,
                'tags': tags or []
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = VSecureClient()
db_password = client.get_secret('DATABASE_PASSWORD')
print(f'Database password: {db_password}')
```

---

### Example 4: GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Get deployment secrets from v-secure
        env:
          VSECURE_API_KEY: ${{ secrets.VSECURE_API_KEY }}
        run: |
          # Get AWS credentials from v-secure
          AWS_KEY=$(curl -s https://mcp.lanonasis.com/api/v1/secrets/AWS_ACCESS_KEY \
            -H "x-api-key: $VSECURE_API_KEY" | jq -r '.value')

          AWS_SECRET=$(curl -s https://mcp.lanonasis.com/api/v1/secrets/AWS_SECRET_KEY \
            -H "x-api-key: $VSECURE_API_KEY" | jq -r '.value')

          # Export for subsequent steps
          echo "::add-mask::$AWS_KEY"
          echo "::add-mask::$AWS_SECRET"
          echo "AWS_ACCESS_KEY_ID=$AWS_KEY" >> $GITHUB_ENV
          echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET" >> $GITHUB_ENV

      - name: Deploy to AWS
        run: |
          aws s3 sync ./dist s3://my-bucket
```

---

### Example 5: Docker Container

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .

# API key passed as build arg or runtime env
ENV VSECURE_API_KEY=""

CMD ["node", "server.js"]
```

```bash
# Run with API key from environment
docker run -e VSECURE_API_KEY=$VSECURE_API_KEY my-app

# Or use Docker secrets (Swarm/Kubernetes)
docker secret create vsecure_key ./api_key.txt
docker service create --secret vsecure_key my-app
```

```javascript
// server.js - read secret at runtime
const apiKey = process.env.VSECURE_API_KEY ||
               fs.readFileSync('/run/secrets/vsecure_key', 'utf8').trim();
```

---

## 💡 Common Use Cases

### Use Case 1: Multi-Environment Secrets

Store different secrets for dev, staging, and production:

```typescript
// Development API key
const devClient = new VSecureClient({
  apiKey: 'lano_dev_abc123',
  environment: 'development'
});

// Production API key (different key, different secrets)
const prodClient = new VSecureClient({
  apiKey: 'lano_live_xyz789',
  environment: 'production'
});

// Same secret key, different values per environment
const dbUrl = await devClient.getSecret('DATABASE_URL');
// Returns: development database URL

const prodDbUrl = await prodClient.getSecret('DATABASE_URL');
// Returns: production database URL
```

---

### Use Case 2: Secret Rotation Without Downtime

```typescript
// Old secret still works
const oldKey = await getSecret('STRIPE_API_KEY');

// Rotate the secret
await rotateSecret('STRIPE_API_KEY', newValue);

// Both old and new secrets work during grace period (configurable)
// After grace period, old secret stops working
```

---

### Use Case 3: Temporary Access for Support

```typescript
// Grant temporary access to support engineer
const tempKey = await createApiKey({
  name: 'Support Engineer - John Doe',
  access_level: 'team',
  expires_in_days: 1, // Expires in 24 hours
  allowed_secrets: ['LOG_VIEWER_TOKEN'], // Only specific secrets
  ip_whitelist: ['203.0.113.10'] // Only from support network
});

// After 24 hours, key automatically expires
```

---

### Use Case 4: MCP Tool Integration (AI Assistants)

```typescript
// Register Claude Code as an MCP tool
const tool = await registerMCPTool({
  toolId: 'claude-code-assistant',
  toolName: 'Claude Code Assistant',
  permissions: {
    keys: ['GITHUB_TOKEN', 'AWS_ACCESS_KEY'],
    environments: ['development'],
    maxSessionDuration: 900 // 15 minutes
  },
  autoApprove: false, // Require manual approval
  riskLevel: 'medium'
});

// Claude requests access (user approves in dashboard)
const session = await requestMCPAccess({
  toolId: 'claude-code-assistant',
  keyNames: ['GITHUB_TOKEN'],
  justification: 'Need to review pull requests'
});

// Claude gets temporary proxy token
const proxyToken = await getProxyToken(session.id, 'GITHUB_TOKEN');
// Use proxy token (maps to real secret, expires with session)
```

---

## ✅ Best Practices

### 1. API Key Security

- ✅ **Rotate regularly**: Set automatic rotation every 90 days
- ✅ **Use different keys**: Separate keys for dev/staging/prod
- ✅ **Least privilege**: Grant minimum necessary access level
- ✅ **Monitor usage**: Set up alerts for unusual activity
- ❌ **Never log keys**: Always redact in logs (`[REDACTED]`)
- ❌ **Never commit**: Add to `.gitignore` immediately

### 2. Secret Management

- ✅ **Use expiration**: Set expiration for temporary secrets
- ✅ **Tag secrets**: Organize with tags (`database`, `payment`, `aws`)
- ✅ **Version control**: v-secure keeps version history automatically
- ✅ **Audit regularly**: Review audit logs monthly
- ❌ **Don't share**: Use temporary access instead
- ❌ **Don't copy**: Retrieve programmatically when needed

### 3. Integration Patterns

- ✅ **Lazy load secrets**: Fetch secrets only when needed
- ✅ **Cache appropriately**: Cache for short periods (5-15 min)
- ✅ **Handle errors**: Always handle API failures gracefully
- ✅ **Use retries**: Implement exponential backoff
- ❌ **Don't hardcode URLs**: Use environment variables
- ❌ **Don't skip validation**: Always validate secrets exist

### 4. Compliance

- ✅ **Enable audit logging**: Track all secret access
- ✅ **Review logs**: Monthly audit trail reviews
- ✅ **Document access**: Maintain access control matrix
- ✅ **Train team**: Security awareness training
- ❌ **Don't skip MFA**: Enable for production access
- ❌ **Don't ignore alerts**: Investigate immediately

---

## 🔧 Troubleshooting

### Problem: "Unauthorized" Error (401)

**Possible Causes:**
1. Invalid API key
2. Expired API key
3. Wrong API key for environment
4. API key revoked

**Solutions:**
```bash
# Verify your API key is correct
curl https://mcp.lanonasis.com/api/v1/health \
  -H "x-api-key: YOUR_KEY_HERE"

# Check key status in dashboard
# Generate new key if expired/revoked
```

---

### Problem: "Secret Not Found" Error (404)

**Possible Causes:**
1. Secret doesn't exist
2. Wrong environment
3. Insufficient permissions
4. Secret expired

**Solutions:**
```typescript
// List all available secrets first
const secrets = await listSecrets();
console.log('Available secrets:', secrets.map(s => s.key));

// Create the secret if missing
await createSecret('MY_SECRET', 'secret-value');
```

---

### Problem: Rate Limiting (429)

**Possible Causes:**
1. Too many requests in short time
2. Multiple services using same key

**Solutions:**
```typescript
// Implement exponential backoff
async function getSecretWithRetry(key: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getSecret(key);
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// Cache secrets to reduce API calls
const cache = new Map();
async function getCachedSecret(key: string) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const value = await getSecret(key);
  cache.set(key, value);
  setTimeout(() => cache.delete(key), 5 * 60 * 1000); // 5 min cache
  return value;
}
```

---

### Problem: CORS Error (Frontend)

**Cause:**
- Direct API calls from browser (not allowed for security)

**Solution:**
- Always use backend proxy (see Example 2 above)

```typescript
// ❌ DON'T: Direct call from browser
fetch('https://mcp.lanonasis.com/api/v1/secrets/KEY', {
  headers: { 'x-api-key': 'lano_...' } // Exposed in browser!
});

// ✅ DO: Call your backend, which calls v-secure
fetch('/api/secrets/KEY', {
  credentials: 'include'
});
```

---

## 🎓 Next Steps

### 1. Read the Full Documentation

- **[README.md](./README.md)**: Full feature overview
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**: Production deployment
- **[CLIENT_INTEGRATION_GUIDE.md](./auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md)**: OAuth2 PKCE for user apps
- **[SECURITY_STANDARDS.md](./SECURITY_STANDARDS.md)**: Compliance details

### 2. Explore Examples

Check the `examples/` directory for:
- Complete integration examples
- Advanced use cases
- MCP tool integration
- Testing strategies

### 3. Join the Community

- **Documentation**: https://docs.lanonasis.com
- **Discord**: https://discord.gg/lanonasis
- **GitHub Issues**: Report bugs or request features
- **Email Support**: support@lanonasis.com

---

## 📚 Quick Reference

### Authentication Headers

| Method | Header | Value Format |
|--------|--------|--------------|
| API Key | `x-api-key` | `lano_[env]_[random]` |
| OAuth2 | `Authorization` | `Bearer [access_token]` |
| Session | Cookie | Auto-sent by browser |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/secrets` | POST | Create/update secret |
| `/api/v1/secrets/:key` | GET | Retrieve secret |
| `/api/v1/secrets` | GET | List all secrets |
| `/api/v1/secrets/:key` | DELETE | Delete secret |
| `/api/v1/api-keys` | POST | Create API key |
| `/api/v1/api-keys/:id/rotate` | POST | Rotate API key |

### Environment Variables

```env
# Required
VSECURE_API_KEY=lano_your_key_here
VSECURE_BASE_URL=https://mcp.lanonasis.com

# Optional
VSECURE_ENVIRONMENT=production
VSECURE_CACHE_TTL=300
VSECURE_TIMEOUT=5000
```

---

## ❓ FAQ

**Q: Can I use the same API key for multiple apps?**
A: You can, but we recommend separate keys per app for better tracking and security.

**Q: How do I migrate from environment variables to v-secure?**
A: Gradually migrate one secret at a time. v-secure can coexist with env vars during transition.

**Q: Is there a rate limit?**
A: Yes. Default is 100 requests/minute per API key. Enterprise plans have higher limits.

**Q: Can I use v-secure on-premises?**
A: Yes! v-secure can be self-hosted. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

**Q: What happens if v-secure is down?**
A: Implement fallbacks using cached secrets. SLA guarantees 99.9% uptime for enterprise plans.

**Q: How are secrets encrypted?**
A: AES-256-GCM with PBKDF2 key derivation (100,000 iterations). Keys are never stored in plaintext.

---

**🎉 You're all set!** Start integrating v-secure into your apps today.

For help, reach out on [Discord](https://discord.gg/lanonasis) or email support@lanonasis.com.

---

**Last Updated**: January 2025
**Version**: 1.0.0
