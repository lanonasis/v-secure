# Vortex API Key Manager

A standalone API key management system extracted from Vortex Secure. This project provides secure, automated secret rotation with zero-trust architecture and first-in-market MCP (Model Context Protocol) integration for AI agent secret access.

## 🌟 Features

- **Automated Rotation**: Zero-downtime secret rotation with configurable schedules
- **MCP Integration**: Secure secret access for AI agents and MCP tools
- **Usage Analytics**: Real-time insights into secret usage patterns
- **Zero-Trust Architecture**: Temporary tokens with automatic expiration
- **CLI Tools**: Command-line interface for managing secrets
- **SDK**: TypeScript SDK for integrating with applications

## 📦 Packages

This monorepo contains:

- `@vortex-secure/mcp-sdk` - TypeScript SDK for secure secret access
- `@vortex-secure/cli` - Command-line interface for secret management

## 🚀 Quick Start

### Installation

```bash
# Install CLI globally
npm install -g @vortex-secure/cli

# Install SDK for your project
npm install @vortex-secure/mcp-sdk
```

### CLI Usage

```bash
# Login to Vortex Secure
vortex login

# Create a secret
vortex set DATABASE_URL --generate

# Get a secret
vortex get DATABASE_URL --copy

# List all secrets
vortex list --environment production

# Schedule rotation every 30 days
vortex schedule DATABASE_URL 30
```

### SDK Usage

```typescript
import { VortexMCPClient } from '@vortex-secure/mcp-sdk';

const client = new VortexMCPClient({
  vortexEndpoint: 'https://api.vortex-secure.com',
  mcpToken: process.env.VORTEX_MCP_TOKEN,
  toolId: 'my-tool',
  toolName: 'My Tool'
});

// Secure secret access - never stores the actual key
export async function processPayment(amount: number, customerId: string) {
  return await client.useSecret('stripe_api_key', async (stripeKey) => {
    const stripe = new Stripe(stripeKey);
    return await stripe.charges.create({
      amount,
      customer: customerId,
      currency: 'usd'
    });
  });
  // Secret is automatically revoked after callback completes
}
```

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/fixer-initiative/vortex-api-key-manager.git
cd vortex-api-key-manager

# Install dependencies
npm install

# Build all packages
npm run build

# Link CLI for development
npm link -w @vortex-secure/cli
```

### Building Packages

```bash
# Build all packages
npm run build

# Build specific package
npm run build -w @vortex-secure/mcp-sdk

# Run build script
./build.sh
```

## ✅ Testing

```bash
# Test CLI
vortex --help

# Test SDK (from project root)
node test-sdk.js
```

## 🔒 Security & Configuration

See `PROJECT_GUIDE.md` for:

- Endpoint allow-list (`VORTEX_ALLOWED_HOSTS`) and HTTPS enforcement
- TLS hardening for axios + ws (custom CA and SPKI pinning)
- Publishing guidance (ensuring `dist/` is included in tarballs)
- Supabase RLS notes and schema constraints

## 📁 Project Structure

```
vortex-api-key-manager/
├── packages/
│   └── vortex-mcp-sdk/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── vortex-cli/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── supabase-schema.sql
├── package.json
├── README.md
└── build.sh
```

## 🗄️ Database Schema

The `supabase-schema.sql` file contains the complete database schema for the API key manager, including:

- Secrets table with encryption and rotation support
- Rotation policies for automated key rotation
- Usage metrics for analytics
- MCP integration tables for AI agent access
- Security events for audit trails

## 🤝 Integration

For integration with Supabase, you'll need to:

1. Create a new Supabase project
2. Run the `supabase-schema.sql` script to set up the database
3. Configure the environment variables for the CLI and SDK

## 📄 License

MIT © The Fixer Initiative
