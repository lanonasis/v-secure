# MCP Router Configuration Guide

## Overview

The MCP (Model Context Protocol) Router provides secure, audited access to external API services. This document explains how to configure new services and understand the credential field placeholders.

## Service Configuration Structure

Each MCP service in the catalog requires specific configuration fields:

### Core Fields

- `service_key`: Unique identifier (e.g., 'stripe', 'github')
- `display_name`: Human-readable name
- `description`: Service description
- `category`: One of: payment, devops, ai, communication, storage, analytics, other
- `credential_fields`: JSON array defining required configuration

### Credential Fields Schema

Each credential field object supports:

```json
{
  "key": "api_key",
  "label": "API Key",
  "type": "password|text|number|boolean|select",
  "required": true|false,
  "placeholder": "sk_live_...",
  "description": "Help text for users",
  "validation": {
    "pattern": "^sk_live_.*",
    "minLength": 20,
    "maxLength": 100
  },
  "options": ["option1", "option2"] // For select type
}
```

## Placeholder Examples by Service Type

### Payment Services

#### Stripe
```json
[
  {
    "key": "secret_key",
    "label": "Secret Key",
    "type": "password",
    "required": true,
    "placeholder": "sk_live_51ABC...XYZ",
    "description": "Stripe secret key from your dashboard",
    "validation": {
      "pattern": "^sk_(live|test)_.*",
      "minLength": 20
    }
  },
  {
    "key": "webhook_secret",
    "label": "Webhook Secret",
    "type": "password",
    "required": false,
    "placeholder": "whsec_abc123...",
    "description": "Optional webhook endpoint secret for signature verification"
  }
]
```

#### PayPal
```json
[
  {
    "key": "client_id",
    "label": "Client ID",
    "type": "text",
    "required": true,
    "placeholder": "AZabc123...",
    "description": "PayPal application client ID"
  },
  {
    "key": "client_secret",
    "label": "Client Secret",
    "type": "password",
    "required": true,
    "placeholder": "EK123...",
    "description": "PayPal application client secret"
  },
  {
    "key": "environment",
    "label": "Environment",
    "type": "select",
    "required": true,
    "options": ["sandbox", "live"],
    "default": "sandbox"
  }
]
```

### DevOps Services

#### GitHub
```json
[
  {
    "key": "token",
    "label": "Personal Access Token",
    "type": "password",
    "required": true,
    "placeholder": "ghp_1234567890ABCDEF...",
    "description": "GitHub PAT with appropriate permissions",
    "validation": {
      "pattern": "^ghp_[A-Za-z0-9]{36}$"
    }
  },
  {
    "key": "base_url",
    "label": "Enterprise URL",
    "type": "text",
    "required": false,
    "placeholder": "https://github.mycompany.com/api/v3",
    "description": "GitHub Enterprise Server URL (optional)"
  }
]
```

#### GitLab
```json
[
  {
    "key": "token",
    "label": "Personal Access Token",
    "type": "password",
    "required": true,
    "placeholder": "glpat-abc123...",
    "description": "GitLab PAT with api scope"
  },
  {
    "key": "base_url",
    "label": "GitLab URL",
    "type": "text",
    "required": false,
    "placeholder": "https://gitlab.com/api/v4",
    "description": "Self-hosted GitLab instance URL"
  }
]
```

### AI Services

#### OpenAI
```json
[
  {
    "key": "api_key",
    "label": "API Key",
    "type": "password",
    "required": true,
    "placeholder": "sk-abc123...",
    "description": "OpenAI API key from platform.openai.com",
    "validation": {
      "pattern": "^sk-[A-Za-z0-9]{48}$"
    }
  },
  {
    "key": "organization",
    "label": "Organization ID",
    "type": "text",
    "required": false,
    "placeholder": "org-abc123...",
    "description": "Optional organization ID for team accounts"
  }
]
```

#### Anthropic Claude
```json
[
  {
    "key": "api_key",
    "label": "API Key",
    "type": "password",
    "required": true,
    "placeholder": "sk-ant-api03-abc123...",
    "description": "Anthropic API key",
    "validation": {
      "pattern": "^sk-ant-api03-[A-Za-z0-9_-]{95}$"
    }
  }
]
```

### Communication Services

#### Slack
```json
[
  {
    "key": "bot_token",
    "label": "Bot User OAuth Token",
    "type": "password",
    "required": true,
    "placeholder": "xoxb-1234567890-...",
    "description": "Slack bot token starting with xoxb-",
    "validation": {
      "pattern": "^xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+$"
    }
  },
  {
    "key": "signing_secret",
    "label": "Signing Secret",
    "type": "password",
    "required": false,
    "placeholder": "abc123def456...",
    "description": "For webhook signature verification"
  }
]
```

## Environment Variable Mapping

The `mcp_env_mapping` field maps credential keys to environment variables:

```json
{
  "api_key": "STRIPE_SECRET_KEY",
  "webhook_secret": "STRIPE_WEBHOOK_SECRET",
  "token": "GITHUB_TOKEN",
  "base_url": "GITHUB_API_URL"
}
```

## MCP Command Configuration

Each service specifies how to spawn its MCP server:

```sql
-- Stripe example
mcp_command = 'npx @stripe/mcp-server-stripe'
mcp_args = '[]'::JSONB
mcp_env_mapping = '{"secret_key": "STRIPE_SECRET_KEY"}'::JSONB

-- GitHub example
mcp_command = 'npx @modelcontextprotocol/server-github'
mcp_args = '[]'::JSONB
mcp_env_mapping = '{"token": "GITHUB_TOKEN"}'::JSONB
```

## Adding New Services

1. **Define credential schema** in `credential_fields`
2. **Configure MCP server** command and environment mapping
3. **Add health check endpoint** for connection validation
4. **Set appropriate category** and metadata
5. **Test configuration** with sample credentials

## Security Considerations

- **Never log credential values** in plain text
- **Use secure placeholders** that don't reveal actual secrets
- **Validate credential formats** on the client side
- **Encrypt credentials** before database storage
- **Use environment variables** for MCP server configuration

## Validation Patterns

Common regex patterns for credential validation:

```javascript
// Stripe secret key
/^sk_(live|test)_[A-Za-z0-9]{20,}$/

// GitHub PAT
/^ghp_[A-Za-z0-9]{36}$/

// OpenAI API key
/^sk-[A-Za-z0-9]{48}$/

// Slack bot token
/^xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+$/
```

This configuration ensures secure, user-friendly credential management while maintaining clear documentation of required fields and their validation rules.