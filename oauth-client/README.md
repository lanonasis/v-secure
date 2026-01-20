# @lanonasis/oauth-client

**THE single authentication package** for the Lanonasis ecosystem. Consolidates all auth patterns: OAuth2 PKCE, API keys, magic links, React hooks, and Express middleware.

> **v2.0**: Now includes `/react` and `/server` exports! Migrating from `@lanonasis/shared-auth`? See [Migration Guide](#migration-from-lanonasisshared-auth).

## Features

### Core Authentication
- **OAuth2 PKCE Flow**: Terminal and desktop (Electron) environments
- **API Key Authentication**: Dashboard-generated keys for instant access
- **Magic Link / OTP Flow**: Passwordless email authentication
- **Token Storage**: Secure backends (Keytar, encrypted files, WebCrypto)

### React Integration (`/react`)
- **`useSSO()`**: React hook for SSO authentication state
- **`useSSOSync()`**: Cross-subdomain session synchronization
- **Cookie utilities**: `parseUserCookie`, `hasSessionCookie`, `clearUserCookie`

### Server Integration (`/server`)
- **`requireAuth()`**: Express middleware enforcing authentication
- **`optionalAuth()`**: Attach user if authenticated, allow anonymous
- **`requireRole(role)`**: Role-based access control middleware
- **Cookie parsing**: `getSSOUserFromRequest`, `getSessionTokenFromRequest`

### Additional Features
- MCP client (WebSocket/SSE) with auto-refreshing tokens
- ESM + CJS bundles with dedicated browser export
- TypeScript types included

## Installation
```bash
npm install @lanonasis/oauth-client
# or
bun add @lanonasis/oauth-client
```

## Quick Start

### Option 1: API Key Authentication (Recommended for New Users)
```ts
import { MCPClient } from '@lanonasis/oauth-client'; // or '@lanonasis/oauth-client/browser' in web-only bundles

// Simple API key mode - perfect for dashboard users
const client = new MCPClient({
  apiKey: 'lano_abc123xyz',  // Get from dashboard
  mcpEndpoint: 'wss://mcp.lanonasis.com'
});

await client.connect();  // Automatically uses API key auth

// Make requests
const memories = await client.searchMemories('test query');
```

### Option 2: OAuth Authentication (For Pre-registered Clients)
```ts
import { MCPClient } from '@lanonasis/oauth-client';

const client = new MCPClient({
  clientId: 'your_oauth_client_id',
  authBaseUrl: 'https://auth.lanonasis.com',
  mcpEndpoint: 'wss://mcp.lanonasis.com',
  scope: 'memories:read memories:write memories:delete profile' // default if omitted
});

await client.connect(); // Triggers OAuth flow, handles refresh
```

### Terminal OAuth flow
```ts
import { TerminalOAuthFlow } from '@lanonasis/oauth-client';

const flow = new TerminalOAuthFlow({
  clientId: 'your_client_id',
  authBaseUrl: 'https://auth.lanonasis.com',
  scope: 'mcp:read'
});

const tokens = await flow.authenticate();
```

### Desktop (Electron) OAuth flow
```ts
import { DesktopOAuthFlow } from '@lanonasis/oauth-client';

const flow = new DesktopOAuthFlow({
  clientId: 'your_client_id',
  authBaseUrl: 'https://auth.lanonasis.com'
});

const tokens = await flow.authenticate();
```

### Magic Link / OTP Flow (Passwordless)
```ts
import { MagicLinkFlow } from '@lanonasis/oauth-client';

const flow = new MagicLinkFlow({
  authBaseUrl: 'https://auth.lanonasis.com'
});

// Send OTP to user's email
await flow.sendOTP('user@example.com');

// User enters the code they received
const tokens = await flow.verifyOTP('user@example.com', '123456');
```

### React Hooks (`/react`)
```tsx
import { useSSO, useSSOSync } from '@lanonasis/oauth-client/react';

function MyComponent() {
  const { user, isAuthenticated, isLoading, error } = useSSO({
    authGatewayUrl: 'https://auth.lanonasis.com',
    projectScope: 'my-app'
  });

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Hello, {user.email}!</div>;
}

// For cross-subdomain session sync
function App() {
  useSSOSync({ pollInterval: 30000 });
  return <MyComponent />;
}
```

### Server Middleware (`/server`)
```ts
import express from 'express';
import {
  requireAuth,
  optionalAuth,
  requireRole,
  getSSOUserFromRequest
} from '@lanonasis/oauth-client/server';

const app = express();

// Require authentication
app.get('/api/profile', requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

// Optional authentication (attach user if present)
app.get('/api/public', optionalAuth(), (req, res) => {
  if (req.user) {
    res.json({ message: `Hello ${req.user.email}` });
  } else {
    res.json({ message: 'Hello guest' });
  }
});

// Role-based access control
app.delete('/api/admin/users/:id', requireAuth(), requireRole('admin'), (req, res) => {
  // Only admins can reach here
});

// Manual user extraction
app.get('/api/check', (req, res) => {
  const user = getSSOUserFromRequest(req);
  res.json({ authenticated: !!user });
});
```

### Token storage
```ts
import { TokenStorage } from '@lanonasis/oauth-client';

const storage = new TokenStorage();
await storage.store(tokens);
const restored = await storage.retrieve();
```

### API key storage (hashes to SHA-256)
```ts
import { ApiKeyStorage } from '@lanonasis/oauth-client';

const apiKeys = new ApiKeyStorage();
await apiKeys.store({ apiKey: 'lns_abc123', environment: 'production' });
const hashed = await apiKeys.getApiKey(); // returns sha256 hex digest
```

## Configuration

### API Key Mode
- `apiKey` (required): Your dashboard-generated API key (starts with `lano_`).
- `mcpEndpoint` (optional): defaults to `wss://mcp.lanonasis.com` and can also be `https://...` for SSE.
- `tokenStorage` (optional): provide a custom storage adapter; defaults to secure Node storage in Node/Electron and WebCrypto+localStorage in browsers.

### OAuth Mode
- `clientId` (required): OAuth client id issued by Lanonasis Auth.
- `authBaseUrl` (optional): defaults to `https://auth.lanonasis.com`.
- `mcpEndpoint` (optional): defaults to `wss://mcp.lanonasis.com` and can also be `https://...` for SSE.
- `scope` (optional): defaults to `memories:read memories:write memories:delete profile`.
- `autoRefresh` (MCPClient): refresh tokens 5 minutes before expiry (default `true`).

**Note**: Auth mode is automatically detected - if you provide `apiKey`, it uses API key authentication. If you provide `clientId`, it uses OAuth.

## Browser builds
- The package ships a browser entry at `@lanonasis/oauth-client/browser`; modern bundlers will also pick it via the `browser` export.
- Browser bundles avoid Node-only deps (`keytar`, `open`, `fs`, `os`, etc.) and use Web Crypto + `localStorage` for token/API key persistence.
- The terminal/device code flow remains Node-only; in browser previews use API key or desktop flow.

## Publishing (maintainers)
1) Build artifacts: `npm install && npm run build`
2) Verify contents: ensure `dist`, `README.md`, `LICENSE` are present.
3) Publish: `npm publish --access public` (registry must have 2FA as configured).
4) Tag in git (optional): `git tag oauth-client-v1.0.0 && git push --tags`

## Files shipped
- `dist/*` compiled CJS/ESM bundles + types
- `README.md`
- `LICENSE`

## Auth-Gateway Compatibility

This SDK implements client-side equivalents of the auth-gateway's authentication methods:

| Auth-Gateway Endpoint | SDK Class | Use Case |
|-----------------------|-----------|----------|
| `POST /oauth/device` | `TerminalOAuthFlow` | CLI/terminal apps |
| `GET /oauth/authorize` | `DesktopOAuthFlow` | Desktop apps (Electron) |
| `POST /v1/auth/otp/*` | `MagicLinkFlow` | Mobile/passwordless |
| `X-API-Key` header | `APIKeyFlow` | Server-to-server |
| `MCPClient` | Combined | Auto-detects best method |

### Methods NOT Exposed (Security)
- Email/Password: Server-rendered form only
- Admin Bypass: Internal emergency access
- Supabase OAuth 2.1: Internal Supabase integration

See [auth-gateway/AUTHENTICATION-METHODS.md](../../apps/onasis-core/services/auth-gateway/AUTHENTICATION-METHODS.md) for complete server-side documentation.

## Exports

| Export | Description | Use Case |
|--------|-------------|----------|
| `@lanonasis/oauth-client` | Main entry - OAuth flows, MCP client, storage | Node.js CLI, servers |
| `@lanonasis/oauth-client/browser` | Browser-safe bundle (no Node deps) | Web apps, SPAs |
| `@lanonasis/oauth-client/react` | React hooks + browser cookie utils | React/Next.js apps |
| `@lanonasis/oauth-client/server` | Express middleware + server cookie utils | Express/Node servers |

## Migration from @lanonasis/shared-auth

`@lanonasis/shared-auth` is now **deprecated**. All functionality has been consolidated into `@lanonasis/oauth-client`.

### Import Changes

```typescript
// ❌ BEFORE (deprecated)
import { useSSO, useSSOSync } from '@lanonasis/shared-auth';
import { getSSOUserFromRequest } from '@lanonasis/shared-auth/server';

// ✅ AFTER (recommended)
import { useSSO, useSSOSync } from '@lanonasis/oauth-client/react';
import { getSSOUserFromRequest, requireAuth } from '@lanonasis/oauth-client/server';
```

### Package.json Changes

```json
{
  "dependencies": {
    // ❌ Remove
    "@lanonasis/shared-auth": "^1.x.x",

    // ✅ Add/Update
    "@lanonasis/oauth-client": "^2.0.0"
  }
}
```

### New Middleware (Bonus!)

The migration gives you access to new middleware that wasn't in shared-auth:

```ts
import { requireAuth, optionalAuth, requireRole } from '@lanonasis/oauth-client/server';

// These are new! Replace manual auth checks
app.get('/api/protected', requireAuth(), handler);
app.delete('/api/admin/*', requireAuth(), requireRole('admin'), handler);
```

## License
MIT © Lan Onasis
