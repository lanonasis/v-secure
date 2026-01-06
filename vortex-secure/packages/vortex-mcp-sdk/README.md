# @vortex-secure/mcp-sdk

First-in-market secure secret access SDK for AI agents and MCP tools. Route requests to external APIs through a unified, security-first platform.

## Installation

```bash
npm install @vortex-secure/mcp-sdk
# or
yarn add @vortex-secure/mcp-sdk
# or
pnpm add @vortex-secure/mcp-sdk
```

## Quick Start

```typescript
import { VortexClient } from '@vortex-secure/mcp-sdk';

const vortex = new VortexClient({
  endpoint: 'https://api.lanonasis.com/mcp/v1',
  apiKey: 'lms_prod_xxx', // Your LanOnasis API key
});

// Route a request to Stripe
const result = await vortex.router.execute({
  service: 'stripe',
  action: 'customers.list',
  params: { limit: 10 }
});
```

## Features

- **Unified API Access**: One SDK to access all your configured services
- **Secure Credential Management**: AES-256-GCM encryption for all stored credentials
- **Scoped API Keys**: Control access at service, environment, and key level
- **Auto-retry & Rate Limiting**: Built-in resilience for production use
- **Multi-platform Support**: Works in Node.js, browsers, and workers

## API Reference

### VortexClient

The main entry point for the SDK.

```typescript
const vortex = new VortexClient({
  endpoint: string;          // API endpoint
  apiKey: string;            // Your lms_* API key
  toolId?: string;           // MCP tool identifier
  toolName?: string;         // MCP tool display name
  environment?: 'development' | 'staging' | 'production';
  autoRetry?: boolean;       // Auto-retry on failures (default: true)
  timeoutMs?: number;        // Request timeout (default: 30000)
});
```

### Service Catalog

Discover and manage available services.

```typescript
// List all services
const services = await vortex.catalog.list();

// Get service details
const stripe = await vortex.catalog.get('stripe');

// Filter by category
const paymentServices = await vortex.catalog.list({
  category: 'payment'
});
```

### Router

Route requests to external APIs.

```typescript
// Basic request
const response = await vortex.router.execute({
  service: 'stripe',
  action: 'charges.create',
  body: { amount: 1000, currency: 'usd' }
});

// With retry
const result = await vortex.router.executeWithRetry(request, {
  maxRetries: 3,
  retryDelayMs: 1000
});

// Batch requests
const results = await vortex.router.executeBatch([
  { service: 'stripe', action: 'customers.list' },
  { service: 'github', action: 'repos.list' }
]);

// Streaming (for supported services)
for await (const chunk of vortex.router.stream(request)) {
  console.log(chunk);
}
```

### API Keys

Manage your API keys programmatically.

```typescript
// List keys
const keys = await vortex.apiKeys.list();

// Create a scoped key
const newKey = await vortex.apiKeys.create({
  name: 'Production App',
  scopeType: 'specific',
  allowedServices: ['stripe', 'github'],
  allowedEnvironments: ['production'],
  rateLimitPerMinute: 60
});

// Revoke a key
await vortex.apiKeys.revoke('key-id', 'Security rotation');

// Rotate a key
const rotated = await vortex.apiKeys.rotate('key-id');
```

### User Services

Configure your external service credentials.

```typescript
// Configure a service
await vortex.services.configure({
  serviceKey: 'stripe',
  credentials: { secret_key: 'sk_live_xxx' },
  environment: 'production'
});

// Test connection
const test = await vortex.services.testConnection('stripe');

// Enable/disable
await vortex.services.setEnabled('stripe', false);
```

### Secret Access (for MCP Tools)

Securely access secrets in AI agent workflows.

```typescript
// Use a secret with auto-cleanup
const result = await vortex.useSecret('STRIPE_API_KEY', async (key) => {
  const stripe = new Stripe(key);
  return stripe.customers.list();
});

// Use multiple secrets
await vortex.useSecrets(['OPENAI_KEY', 'DB_URL'], async (secrets) => {
  // secrets.OPENAI_KEY, secrets.DB_URL
});

// Inject into environment (Node.js only)
const env = await vortex.injectSecrets(['API_KEY', 'DB_URL']);
```

## Events

Subscribe to SDK events for monitoring.

```typescript
// Rate limit warnings
vortex.on('rate_limit.warning', ({ service, remaining }) => {
  console.log(`${service}: ${remaining} requests remaining`);
});

// Errors
vortex.on('error', ({ service, action, error }) => {
  console.error(`Error in ${service}/${action}: ${error}`);
});

// All events
vortex.onAll((event) => {
  console.log(event);
});
```

## API Key Format

LanOnasis API keys follow this format:

```
lms_{environment}_{random}
```

- `lms_prod_xxx` - Production keys
- `lms_test_xxx` - Testing/development keys
- `lms_stg_xxx` - Staging keys

Legacy `vx_*` keys are still supported for backward compatibility.

## Environment Variables

For Node.js, you can configure via environment:

```bash
VORTEX_ENDPOINT=https://api.lanonasis.com/mcp/v1
VORTEX_API_KEY=lms_prod_xxx
MCP_TOOL_ID=my-tool
MCP_TOOL_NAME=My Tool
```

```typescript
import { createVortexClientFromEnv } from '@vortex-secure/mcp-sdk';

const vortex = createVortexClientFromEnv();
```

## TypeScript

Full TypeScript support with comprehensive types:

```typescript
import type {
  VortexConfig,
  RouterRequest,
  RouterResponse,
  MCPService,
  APIKey,
  UserService,
} from '@vortex-secure/mcp-sdk';
```

## Browser Support

The SDK works in browsers with some limitations:

- `injectSecrets()` is Node.js only
- WebSocket approval flow auto-falls back to polling

## License

MIT

## Links

- [Documentation](https://docs.lanonasis.com/mcp-sdk)
- [API Reference](https://api.lanonasis.com/docs)
- [GitHub Issues](https://github.com/lanonasis/v-secure/issues)
