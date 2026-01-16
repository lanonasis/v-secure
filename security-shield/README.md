# @lanonasis/security-shield

Edge-layer security for Netlify & Vercel deployments. Part of the **LanOnasis Security Suite**.

[![npm version](https://badge.fury.io/js/%40lanonasis%2Fsecurity-shield.svg)](https://www.npmjs.com/package/@lanonasis/security-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Docs:** https://docs.lanonasis.com | **Platform:** https://vortexshield.lanonasis.com

---

## LanOnasis Security Suite

| Package | Layer | Purpose |
|---------|-------|---------|
| **@lanonasis/security-shield** | Edge/CDN | Bot protection, WAF, attack mitigation |
| [@lanonasis/security-sdk](https://www.npmjs.com/package/@lanonasis/security-sdk) | Application | Encryption, key management, API keys |

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  🛡️ @lanonasis/security-shield (Edge Layer)                │
│  ├─ Bot Detection & Blocking                                │
│  ├─ Honeypot Traps                                          │
│  ├─ Attack Pattern Detection (SQLi, XSS, Path Traversal)    │
│  ├─ Sensitive File Protection (.env, .git, etc.)            │
│  └─ Security Headers (HSTS, CSP, X-Frame-Options)           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  🔐 @lanonasis/security-sdk (Application Layer)             │
│  ├─ AES-256-GCM Encryption                                  │
│  ├─ Key Derivation (HKDF, PBKDF2)                           │
│  ├─ API Key Generation & Hashing                            │
│  ├─ Password Hashing & Verification                         │
│  └─ Key Rotation                                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

- 🤖 **Bot Detection** - Block 50+ known malicious user agents
- 🍯 **Honeypot Traps** - Slow down scanners with delayed responses  
- 🔒 **Sensitive File Protection** - Block access to .env, .git, config files
- 🛑 **Attack Pattern Detection** - Block SQL injection, XSS, path traversal
- 📝 **Security Headers** - HSTS, CSP, X-Frame-Options, and more
- 📊 **Security Logging** - Track all blocked requests with geo data
- ⚡ **Multi-Platform** - Works with both **Netlify** and **Vercel**
- 🔄 **Auto-Detection** - Automatically detects your deployment platform

---

## Quick Start

### Option 1: CLI (Recommended)

```bash
# Auto-detect platform (Netlify or Vercel)
npx @lanonasis/security-shield init

# Force specific platform
npx @lanonasis/security-shield init --vercel
npx @lanonasis/security-shield init --netlify

# Audit your security configuration  
npx @lanonasis/security-shield check

# Update to latest security rules
npx @lanonasis/security-shield update
```

### Option 2: Manual - Vercel

```bash
npm install @lanonasis/security-shield
```

Create `middleware.ts` (or `src/middleware.ts`):

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Copy from templates/vercel/middleware.ts
export function middleware(request: NextRequest) {
  // Security logic here...
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Option 3: Manual - Netlify

```bash
npm install @lanonasis/security-shield
```

Create `netlify/edge-functions/security.ts`:

```typescript
import { createSecurityShield } from '@lanonasis/security-shield';

export default createSecurityShield();

export const config = {
  path: '/*',
  excludedPath: ['/favicon.ico', '/_next/static/*'],
};
```

---

## Configuration

### Using Presets

```typescript
import { createSecurityShield, standardConfig, maxSecurityConfig } from '@lanonasis/security-shield';

// Standard protection (recommended)
export default createSecurityShield(standardConfig);

// Maximum protection
export default createSecurityShield(maxSecurityConfig);
```

### Custom Configuration

```typescript
import { createSecurityShield } from '@lanonasis/security-shield';

export default createSecurityShield({
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,
  honeypotDelay: 2000,
  blockResponse: 404,
  
  // Add custom rules
  customBlockedPaths: [/^\/internal-api/i],
  customBlockedUserAgents: [/my-competitor-bot/i],
});
```

---

## Using with @lanonasis/security-sdk

For full-stack security, use both packages:

```typescript
// Edge function (security-shield) - runs at CDN edge
// netlify/edge-functions/security.ts
import { createSecurityShield } from '@lanonasis/security-shield';
export default createSecurityShield();

// API route (security-sdk) - runs in your application
// api/store-credentials.ts
import { getSecuritySDK } from '@lanonasis/security-sdk';

export async function POST(request: Request) {
  const security = getSecuritySDK();
  const { apiKey } = await request.json();
  
  // Encrypt sensitive data before storing
  const encrypted = security.encrypt(apiKey, `user_${userId}_stripe`);
  await db.insert('credentials', encrypted);
  
  return Response.json({ success: true });
}
```

---

## What Gets Blocked

### Sensitive Files
`.env`, `.git/`, `config.php`, `wp-config.php`, `*.sql`, `*.bak`, `*.log`

### Attack Vectors  
WordPress probing, phpMyAdmin, webhook scanning, shell attempts, SQL injection, XSS

### Malicious Bots
Security scanners (Nikto, Nmap, sqlmap), aggressive crawlers (Bytespider, PetalBot), SEO bots (Semrush, Ahrefs)

---

## Files Generated

| File | Purpose |
|------|---------|
| `netlify/edge-functions/security-shield.ts` | Main edge function |
| `_headers` | Security headers |
| `netlify.toml` / `security-redirects.toml` | Redirect rules |
| `robots.txt` | Bot blocking rules |
| `security-shield.config.json` | Your configuration |

---

## Security Logging

View logs at: `https://app.netlify.com/projects/YOUR_SITE/logs/edge-functions`

```json
{
  "id": "a1b2c3d4",
  "type": "BLOCK",
  "reason": "MALICIOUS_USER_AGENT",
  "path": "/admin",
  "method": "GET",
  "userAgent": "sqlmap/1.0",
  "ip": "192.168.1.1",
  "country": "CN",
  "timestamp": "2024-01-16T12:00:00.000Z"
}
```

---

## Related Packages

| Package | Description |
|---------|-------------|
| [@lanonasis/security-sdk](https://www.npmjs.com/package/@lanonasis/security-sdk) | Encryption, key management, API key generation |
| [@lanonasis/privacy-sdk](https://www.npmjs.com/package/@lanonasis/privacy-sdk) | PII detection, data masking, GDPR compliance |
| [@lanonasis/mem-intel-sdk](https://www.npmjs.com/package/@lanonasis/mem-intel-sdk) | Memory intelligence and context management |
| [@lanonasis/oauth-client](https://www.npmjs.com/package/@lanonasis/oauth-client) | OAuth client for LanOnasis services |

---

## License

MIT © [LanOnasis](https://lanonasis.com)

---

Built with 🔒 by the LanOnasis team
