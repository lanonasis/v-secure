# @lanonasis/oauth-client

Drop-in OAuth + API Key authentication client for the Lanonasis ecosystem. Supports dual authentication modes: OAuth2 PKCE flow for pre-registered clients and direct API key authentication for dashboard users. Handles browser/desktop/terminal flows, token lifecycle, secure storage, and MCP WebSocket/SSE connections.

## Features
- **Dual Authentication**: OAuth2 PKCE flow OR direct API key authentication
- OAuth flows for terminal and desktop (Electron-friendly) environments
- API key authentication for new users with dashboard-generated keys
- Token storage with secure backends (Keytar, encrypted files, Electron secure store, mobile secure storage, WebCrypto in browsers); browser builds auto-use web storage
- API key storage that normalizes to SHA-256 digests before persisting
- MCP client that connects over WebSocket (`/ws`) or SSE (`/sse`) with auto-refreshing tokens
- Automatic auth mode detection based on configuration
- ESM + CJS bundles with a dedicated browser export to avoid Node-only deps

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

## License
MIT © Lan Onasis
