# @lanonasis/oauth-client

Drop-in OAuth + MCP connectivity client for the Lanonasis ecosystem. Handles browser/desktop/terminal flows, token lifecycle, secure (hashed) API key storage, and MCP WebSocket/SSE connections so other projects can integrate without re-implementing auth.

## Features
- OAuth flows for terminal and desktop (Electron-friendly) environments
- Token storage with secure backends (Keytar, encrypted files, Electron secure store, mobile secure storage, WebCrypto in browsers)
- API key storage that normalizes to SHA-256 digests before persisting
- MCP client that connects over WebSocket (`/ws`) or SSE (`/sse`) with auto-refreshing tokens
- ESM + CJS bundles with TypeScript types

## Installation
```bash
npm install @lanonasis/oauth-client
# or
bun add @lanonasis/oauth-client
```

## Quick Start
```ts
import { MCPClient } from '@lanonasis/oauth-client';

const client = new MCPClient({
  clientId: 'your_oauth_client_id',
  authBaseUrl: 'https://auth.lanonasis.com',
  mcpEndpoint: 'wss://mcp.lanonasis.com',
  scope: 'mcp:read mcp:write api_keys:manage'
});

await client.connect(); // handles auth, refresh, and MCP connect
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
- `clientId` (required): OAuth client id issued by Lanonasis Auth.
- `authBaseUrl` (optional): defaults to `https://auth.lanonasis.com`.
- `mcpEndpoint` (optional): defaults to `wss://mcp.lanonasis.com` and can also be `https://...` for SSE.
- `scope` (optional): defaults to `mcp:read mcp:write api_keys:manage`.
- `autoRefresh` (MCPClient): refresh tokens 5 minutes before expiry (default `true`).

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
