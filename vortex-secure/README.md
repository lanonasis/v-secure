# 🔐 Vortex Secure - Developer-Friendly Secret Management

> **First-in-market MCP-native secret management platform**  
> Secure, automated secret rotation with zero-trust AI agent integration

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

## 🌟 Why Vortex Secure?

**The Problem**: Managing secrets across microservices, AI agents, and cloud deployments is complex, error-prone, and lacks visibility.

**The Solution**: Vortex Secure provides a centralized, developer-friendly platform with:

- ⚡ **Automated Rotation**: Zero-downtime secret rotation with configurable schedules
- 🤖 **MCP Integration**: First-in-market secure secret access for AI agents
- 📊 **Usage Analytics**: Real-time insights into secret usage patterns
- 🛡️ **Zero-Trust Architecture**: Temporary tokens with automatic expiration
- 🔧 **Developer Tools**: CLI, SDK, and webhook integrations

## 🚀 Quick Start

### 1. Installation

```bash
# Web Dashboard
npm create vite@latest my-vortex-project -- --template react-ts
cd my-vortex-project
npm install @vortex-secure/client

# CLI Tool
npm install -g @vortex-secure/cli

# MCP SDK (for AI agents)
npm install @vortex-secure/mcp-sdk
```

### 2. Authentication

```bash
# Login to Vortex Secure
vortex login

# Initialize your project
vortex init my-app --environment development
```

### 3. Create Your First Secret

```bash
# Create a secret
vortex set DATABASE_URL --generate

# Get a secret
vortex get DATABASE_URL --copy

# List all secrets
vortex list --environment production
```

### 4. Automated Rotation

```bash
# Schedule rotation every 30 days
vortex schedule DATABASE_URL 30

# Rotate immediately
vortex rotate DATABASE_URL --immediate
```

## 🤖 MCP Integration (AI Agents)

**World's first secure secret access for AI agents and MCP tools:**

```typescript
import { VortexMCPClient } from '@vortex-secure/mcp-sdk';

const client = new VortexMCPClient({
  vortexEndpoint: 'https://api.vortex-secure.com',
  mcpToken: process.env.VORTEX_MCP_TOKEN,
  toolId: 'stripe-payment-processor',
  toolName: 'Stripe Payment Processor'
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

### Register Your MCP Tool

```typescript
await client.registerTool({
  permissions: {
    secrets: ['stripe_api_key', 'database_url'],
    environments: ['staging', 'production'],
    maxConcurrentSessions: 3,
    maxSessionDuration: 600 // 10 minutes
  },
  autoApprove: false, // Require manual approval
  riskLevel: 'high'
});
```

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Vortex Secure Platform                   │
├─────────────────────────────────────────────────────────────┤
│  🖥️  Developer Dashboard   │  📊 Analytics Engine          │
│  • Secret Management UI    │  • Usage Monitoring           │
│  • Rotation Scheduler      │  • Anomaly Detection          │
│  • Access Control Panel    │  • Compliance Reports         │
├─────────────────────────────┼─────────────────────────────────┤
│  🔧 Vortex API Gateway     │  🤖 MCP Integration Layer     │
│  • REST/GraphQL Endpoints  │  • AI Agent Access Control    │
│  • Webhook Management      │  • Temporary Token System     │
│  • Rate Limiting & Auth    │  • Real-time Session Monitor  │
├─────────────────────────────┴─────────────────────────────────┤
│           🔐 Secure Vault Layer (Multi-Provider)            │
│  • Supabase (MVP) / HashiCorp Vault / AWS Secrets Manager  │
│  • AES-256 Encryption     │ TLS 1.3 Transit Security      │
│  • Row Level Security     │ Multi-Region Replication      │
└─────────────────────────────────────────────────────────────┘
```

### Security Model

- **Client-side Encryption**: Secrets encrypted before leaving your browser
- **Zero-Knowledge**: Vortex never sees your unencrypted secrets
- **Temporary Tokens**: AI agents get time-limited proxy tokens, not real secrets
- **Audit Trail**: Complete visibility into who accessed what, when
- **Automatic Expiration**: All access tokens auto-expire

## 📱 Web Dashboard

### Secret Management

```tsx
import { SecretsList, CreateSecretForm } from '@vortex-secure/client';

function Dashboard() {
  return (
    <div className="space-y-6">
      <SecretsList 
        projectId="my-project"
        environment="production"
        onCreateSecret={() => setShowCreate(true)}
      />
      
      <CreateSecretForm
        onSuccess={() => refreshSecrets()}
      />
    </div>
  );
}
```

### MCP Monitoring

```tsx
import { MCPAccessMonitor } from '@vortex-secure/client';

function MCPDashboard() {
  return (
    <MCPAccessMonitor />
    // Shows:
    // - Active AI agent sessions
    // - Real-time secret access
    // - Risk level distribution
    // - Approval workflows
  );
}
```

## 🔄 Automated Rotation

### Rotation Policies

```typescript
import { RotationScheduler } from '@vortex-secure/client';

const scheduler = new RotationScheduler(masterPassword);

// Schedule automatic rotation
await scheduler.scheduleRotation('api_key', 30); // Every 30 days

// Custom rotation with webhooks
await scheduler.scheduleRotation('database_url', 90, {
  overlapHours: 48,
  notificationWebhooks: ['https://api.myapp.com/webhooks/rotation'],
  autoApprove: true
});
```

### Rotation Events

```typescript
// Webhook payload when rotation occurs
{
  event: 'secret.rotated',
  secret_id: 'stripe_api_key',
  new_value: 'vx_proxy_token_xyz', // Temporary proxy token
  old_value_expires: '2024-01-15T10:30:00Z',
  rotation_id: 'rot_1642248600000'
}
```

## 📊 Analytics & Monitoring

### Usage Analytics

```bash
# CLI analytics
vortex usage API_KEY --days 30
vortex rotations --overdue

# Show security events
vortex events --severity high --days 7
```

### Real-time Dashboard

- **Active Sessions**: Live view of AI agent secret access
- **Usage Patterns**: Identify anomalous access patterns
- **Performance Metrics**: Secret access latency and error rates
- **Compliance Reports**: Audit logs for SOC2, PCI DSS compliance

## 🛠️ Integration Examples

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy with Vortex Secrets

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get Deployment Secrets
        uses: vortex-secure/github-action@v1
        with:
          secrets: |
            DATABASE_URL
            API_KEY
            STRIPE_SECRET
          environment: production
          
      - name: Deploy Application
        run: |
          # Secrets are now available as environment variables
          docker deploy --env DATABASE_URL --env API_KEY
```

### Docker Integration

```dockerfile
# Dockerfile with Vortex CLI
FROM node:18-alpine

RUN npm install -g @vortex-secure/cli

# Runtime secret injection
ENTRYPOINT ["vortex", "exec", "--", "npm", "start"]
```

### Kubernetes

```yaml
# k8s-secret-injector.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  annotations:
    vortex-secure/managed: "true"
    vortex-secure/rotation-frequency: "30d"
type: Opaque
stringData:
  DATABASE_URL: "{{ vortex.secret('database_url') }}"
  API_KEY: "{{ vortex.secret('api_key') }}"
```

## 🔒 Security Features

### Encryption

- **Algorithm**: AES-256-GCM with PBKDF2 key derivation
- **Key Management**: Client-side master password + hardware security modules
- **Transport**: TLS 1.3 with certificate pinning
- **Storage**: Row-level security with encrypted columns

### Access Control

- **RBAC**: Role-based permissions per project/environment
- **Time-based**: Restrict access to specific time windows
- **IP Whitelisting**: Limit access by source IP/CIDR
- **MFA**: Multi-factor authentication for sensitive operations

### Compliance

- **Audit Logs**: Immutable logs of all secret access
- **Data Residency**: Choose your data storage region
- **Backup & Recovery**: Encrypted backups with point-in-time recovery
- **Compliance Reports**: SOC2, ISO 27001, PCI DSS ready

## 📈 Pricing

### Developer (Free)
- 50 secrets
- Basic rotation (manual)
- Community support
- 1 project

### Team ($49/month)
- 500 secrets
- Automated rotation
- Usage analytics
- MCP integration
- 10 projects
- Email support

### Enterprise ($199/month)
- Unlimited secrets
- Advanced analytics
- Compliance reports
- SSO/SAML
- Custom integrations
- SLA support

### Custom
- On-premise deployment
- Multi-region
- White-label
- Custom SLA

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

```bash
# Development setup
git clone https://github.com/fixer-initiative/vortex-secure
cd vortex-secure
npm install
npm run dev
```

### Development Stack

- **Frontend**: React + TypeScript + Vite + Tailwind + Shadcn/UI
- **Backend**: Supabase (MVP) → Node.js + PostgreSQL + Redis
- **CLI**: Node.js + Commander + Inquirer
- **MCP SDK**: TypeScript + WebSocket for real-time updates

## 📚 Documentation

- [📖 Full Documentation](https://docs.vortex-secure.com)
- [🚀 API Reference](https://docs.vortex-secure.com/api)
- [🔧 CLI Reference](https://docs.vortex-secure.com/cli)
- [🤖 MCP Guide](https://docs.vortex-secure.com/mcp)
- [🎯 Examples](https://github.com/fixer-initiative/vortex-secure-examples)

## 🆘 Support

- [💬 Discord Community](https://discord.gg/vortex-secure)
- [🐛 Report Issues](https://github.com/fixer-initiative/vortex-secure/issues)
- [📧 Enterprise Support](mailto:enterprise@vortex-secure.com)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by [The Fixer Initiative](https://github.com/fixer-initiative)**

[Website](https://vortex-secure.com) • [Documentation](https://docs.vortex-secure.com) • [Twitter](https://twitter.com/vortexsecure)

</div>