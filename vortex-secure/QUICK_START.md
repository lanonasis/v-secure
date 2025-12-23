# 🚀 Vortex Secure - Quick Start Guide

Get up and running with Vortex Secure in under 5 minutes!

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- A Vortex Secure account (sign up at [vortex-secure.com](https://vortex-secure.com))

## ⚡ 5-Minute Setup

### Step 1: Install the CLI

```bash
npm install -g @vortex-secure/cli
```

### Step 2: Login

```bash
vortex login
# Opens browser for OAuth authentication
# Or use API token: vortex login --token YOUR_API_TOKEN
```

### Step 3: Initialize Your Project

```bash
# In your project directory
vortex init my-awesome-app --environment development

# This creates a .vortex config file
```

### Step 4: Create Your First Secret

```bash
# Generate a secure API key
vortex set STRIPE_API_KEY --generate --type api_key

# Or set a custom value
vortex set DATABASE_URL "postgresql://user:pass@localhost:5432/mydb"

# Add tags for organization
vortex set OPENAI_API_KEY --generate --tags "ai,production,critical"
```

### Step 5: Use Your Secrets

```bash
# Get a secret (copies to clipboard)
vortex get STRIPE_API_KEY --copy

# List all secrets
vortex list --environment development

# Use in your application
export $(vortex env --environment development)
npm start
```

## 🔄 Set Up Automated Rotation

```bash
# Rotate every 30 days with 24-hour overlap
vortex schedule STRIPE_API_KEY 30 --overlap 24

# Rotate immediately
vortex rotate STRIPE_API_KEY --immediate

# Check rotation status
vortex rotations
```

## 🤖 MCP Integration (AI Agents)

### Install MCP SDK

```bash
npm install @vortex-secure/mcp-sdk
```

### Basic Usage

```typescript
// stripe-agent.ts
import { VortexMCPClient } from '@vortex-secure/mcp-sdk';

const client = new VortexMCPClient({
  vortexEndpoint: 'https://api.vortex-secure.com',
  mcpToken: process.env.VORTEX_MCP_TOKEN,
  toolId: 'stripe-payment-agent',
  toolName: 'Stripe Payment Agent'
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
  // ✅ Secret automatically revoked after use
}
```

### Register Your MCP Tool

```typescript
// Register once during setup
await client.registerTool({
  permissions: {
    secrets: ['stripe_api_key', 'database_url'],
    environments: ['development', 'staging'],
    maxConcurrentSessions: 2,
    maxSessionDuration: 300 // 5 minutes
  },
  autoApprove: true, // For development
  riskLevel: 'medium'
});
```

## 🖥️ Web Dashboard Setup

### Install React Components

```bash
npm install @vortex-secure/client
```

### Basic Dashboard

```tsx
// Dashboard.tsx
import React from 'react';
import { SecretsList, MCPAccessMonitor } from '@vortex-secure/client';

export function Dashboard() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Vortex Secure Dashboard</h1>
      
      {/* Secret Management */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Secrets</h2>
        <SecretsList 
          projectId="my-awesome-app"
          environment="development"
        />
      </section>
      
      {/* MCP Monitoring */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">AI Agent Access</h2>
        <MCPAccessMonitor />
      </section>
    </div>
  );
}
```

## 🔧 Common Use Cases

### 1. Database Connection Rotation

```bash
# Set database URL with auto-rotation
vortex set DATABASE_URL "postgresql://user:pass@db.example.com:5432/prod" \
  --environment production \
  --tags "database,critical" \
  --schedule 90 # Rotate every 90 days
```

### 2. API Key Management

```bash
# Generate secure API keys
vortex set OPENAI_API_KEY --generate --type api_key
vortex set STRIPE_SECRET_KEY --generate --type api_key
vortex set WEBHOOK_SECRET --generate --type webhook_secret

# Set different keys per environment
vortex set STRIPE_SECRET_KEY --generate --environment development
vortex set STRIPE_SECRET_KEY --generate --environment production
```

### 3. CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy with Vortex

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Vortex CLI
        run: |
          npm install -g @vortex-secure/cli
          echo "${{ secrets.VORTEX_TOKEN }}" | vortex login --token
      
      - name: Deploy with Secrets
        run: |
          # Inject secrets as environment variables
          eval $(vortex env --environment production)
          
          # Deploy your application
          docker build -t myapp .
          docker run -e DATABASE_URL -e API_KEY myapp
```

### 4. Local Development

```bash
# Create development environment file
vortex export --environment development --format env --output .env.development

# Or use with your development server
vortex exec --environment development -- npm run dev
```

## 📊 Monitoring & Analytics

### View Usage Analytics

```bash
# Check secret usage
vortex usage STRIPE_API_KEY --days 7

# View security events
vortex events --severity high --days 30

# Check rotation schedule
vortex rotations --environment production
```

### Real-time Monitoring

Access the web dashboard at `https://dashboard.vortex-secure.com` to see:

- 📊 **Usage Analytics**: Request volumes, error rates, response times
- 🤖 **AI Agent Activity**: Live MCP tool sessions and access patterns
- 🔄 **Rotation Status**: Upcoming rotations and success rates
- 🛡️ **Security Events**: Failed access attempts and anomalies

## 🚨 Security Best Practices

### 1. Environment Separation

```bash
# Always separate environments
vortex set API_KEY_DEV --generate --environment development
vortex set API_KEY_PROD --generate --environment production

# Never use production secrets in development
```

### 2. Rotation Schedules

```bash
# High-risk secrets: rotate monthly
vortex schedule PAYMENT_API_KEY 30

# Medium-risk secrets: rotate quarterly  
vortex schedule DATABASE_URL 90

# Low-risk secrets: rotate annually
vortex schedule STATIC_ASSET_KEY 365
```

### 3. Access Control

```bash
# Use specific permissions for MCP tools
await client.registerTool({
  permissions: {
    secrets: ['specific_api_key'], // Not ['*']
    environments: ['development'], // Not all environments
    maxSessionDuration: 300 // Keep sessions short
  },
  autoApprove: false, // Require approval for production
  riskLevel: 'high' // Be explicit about risk
});
```

### 4. Monitoring

```bash
# Set up alerts for suspicious activity
vortex config --set alerts.failed_access_threshold 5
vortex config --set alerts.webhook_url https://alerts.mycompany.com

# Regular security audits
vortex audit --export audit-$(date +%Y-%m-%d).json
```

## 🔗 Integration Examples

### Express.js Application

```typescript
// app.ts
import express from 'express';
import { VortexMCPClient } from '@vortex-secure/mcp-sdk';

const app = express();
const vortex = new VortexMCPClient({
  vortexEndpoint: process.env.VORTEX_ENDPOINT!,
  mcpToken: process.env.VORTEX_MCP_TOKEN!,
  toolId: 'express-api',
  toolName: 'Express API Server'
});

app.post('/charge', async (req, res) => {
  const { amount, customer } = req.body;
  
  try {
    const result = await vortex.useSecret('stripe_secret_key', async (key) => {
      const stripe = new Stripe(key);
      return await stripe.charges.create({
        amount,
        currency: 'usd',
        customer
      });
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Next.js API Route

```typescript
// pages/api/payment.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createMCPClientFromEnv } from '@vortex-secure/mcp-sdk';

const vortex = createMCPClientFromEnv({
  toolId: 'nextjs-payment-api',
  toolName: 'Next.js Payment API'
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const charge = await vortex.useSecret('stripe_secret_key', async (key) => {
      // Payment processing logic
      return await processPayment(key, req.body);
    });

    res.json({ success: true, charge });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 🎯 Next Steps

Now that you're set up with Vortex Secure:

1. **📚 Read the Full Documentation**: [docs.vortex-secure.com](https://docs.vortex-secure.com)
2. **🔗 Explore Integrations**: Check out [example repositories](https://github.com/fixer-initiative/vortex-secure-examples)
3. **💬 Join the Community**: [Discord server](https://discord.gg/vortex-secure)
4. **🛡️ Set Up Monitoring**: Configure your monitoring dashboard
5. **🔄 Automate Rotations**: Set up rotation schedules for all secrets

## ❓ Need Help?

- 📖 **Documentation**: [docs.vortex-secure.com](https://docs.vortex-secure.com)
- 💬 **Community**: [Discord](https://discord.gg/vortex-secure)
- 🐛 **Issues**: [GitHub Issues](https://github.com/fixer-initiative/vortex-secure/issues)
- 📧 **Support**: [support@vortex-secure.com](mailto:support@vortex-secure.com)

Welcome to secure, automated secret management! 🎉