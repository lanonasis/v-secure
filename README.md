<div align="center">

# 🔐 v-secure

### Enterprise-Grade Security Service by LanOnasis

*Your secrets deserve better. Production-ready security that scales with confidence.*

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/lanonasis/v-secure)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Security](https://img.shields.io/badge/security-SOC%202%20|%20ISO%2027001-brightgreen.svg)](#security-standards-compliance)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) • [Quick Start](#-installation) • [Documentation](#-table-of-contents) • [Security](#-security-standards-compliance) • [Support](#-support)

---

</div>

## 🌟 Why v-secure?

In a world where data breaches cost millions and compliance is non-negotiable, **v-secure** delivers enterprise-grade secret management without the enterprise complexity. Born from real-world production needs and refined through rigorous security standards, v-secure is the security service you can trust from day one.

**Built for developers who care about security. Designed for enterprises that demand compliance.**

## 📋 Table of Contents

- [Overview](#overview)
- [Security Standards Compliance](#security-standards-compliance)
- [Architecture](#architecture)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Future Improvements](#future-improvements)

---

## 🎯 Overview

**v-secure** is a standalone, production-ready security service extracted from a battle-tested monorepo. It's designed to be dropped into any Node.js or Bun application, providing instant enterprise-grade security without the complexity of managing your own cryptographic infrastructure.

### Core Capabilities

| Feature | What You Get |
|---------|-------------|
| 🔐 **Secret Management** | AES-256-GCM encrypted storage with version control, expiration, and secure sharing |
| 🔑 **API Key Lifecycle** | Complete key management from creation to rotation, with usage analytics and anomaly detection |
| 🤖 **MCP Integration** | Model Context Protocol support for secure AI tool access with approval workflows |
| 📝 **Immutable Audit Logs** | HMAC-signed, tamper-proof audit trails for complete compliance visibility |
| 🛡️ **Access Control** | Role-based access control (RBAC) with fine-grained permissions and multi-tenancy |
| 🔒 **Enterprise Encryption** | PBKDF2 key derivation, automatic key rotation, and TLS 1.3 for data in transit |
| ✅ **Compliance Ready** | Built-in support for SOC 2, ISO 27001, GDPR, PCI DSS, HIPAA, and OWASP Top 10 |

### What Makes v-secure Different?

- **Zero Configuration Complexity**: Environment variables and you're running. No complex setup wizards.
- **Compliance Built-In**: Not bolted-on. Every feature designed with SOC 2 and ISO 27001 in mind.
- **Developer-First API**: Intuitive TypeScript APIs that feel natural to use.
- **Production-Tested**: Extracted from real production systems managing millions in secret operations.
- **Open Source**: Fully transparent security. Audit the code yourself.

---

## 🛡️ Security Standards Compliance

### Current Standards

#### 1. **OWASP Top 10 (2023)**
- ✅ **A01:2021 – Broken Access Control**: Implemented RLS policies and RBAC
- ✅ **A02:2021 – Cryptographic Failures**: AES-256-GCM encryption with secure key derivation
- ✅ **A03:2021 – Injection**: Parameterized queries via Supabase client
- ✅ **A04:2021 – Insecure Design**: Security-first architecture with defense in depth
- ✅ **A07:2021 – Identification and Authentication Failures**: JWT-based auth with MFA support
- ✅ **A09:2021 – Security Logging and Monitoring Failures**: Comprehensive audit logging

#### 2. **NIST Cybersecurity Framework**
- ✅ **Identify**: Asset inventory and risk assessment capabilities
- ✅ **Protect**: Encryption, access control, and secure configuration
- ✅ **Detect**: Audit logging and security event monitoring
- ✅ **Respond**: Incident response through audit trails
- ✅ **Recover**: Version history and secret rollback capabilities

#### 3. **SOC 2 Type II**
- ✅ **Security**: Encryption at rest and in transit, access controls
- ✅ **Availability**: High availability through Supabase infrastructure
- ✅ **Processing Integrity**: Immutable audit logs with HMAC signatures
- ✅ **Confidentiality**: Encryption and access control mechanisms
- ✅ **Privacy**: GDPR-compliant data handling

#### 4. **ISO 27001:2022**
- ✅ **A.5.15**: Access control policies and procedures
- ✅ **A.8.24**: Cryptographic controls
- ✅ **A.5.28**: Collection of evidence (audit logging)
- ✅ **A.8.11**: Data masking and encryption

#### 5. **PCI DSS 4.0** (for payment-related secrets)
- ✅ **Requirement 3**: Protect stored cardholder data (encryption)
- ✅ **Requirement 8**: Identify and authenticate access
- ✅ **Requirement 10**: Log and monitor all access

#### 6. **GDPR Compliance**
- ✅ **Article 32**: Security of processing (encryption, pseudonymization)
- ✅ **Article 30**: Records of processing activities (audit logs)
- ✅ **Article 17**: Right to erasure (secret deletion)

---

## 🏗️ Architecture

```
security-service/
├── README.md                          # This file
├── SECURITY_STANDARDS.md              # Detailed compliance documentation
├── DEPLOYMENT_GUIDE.md                # Deployment instructions
├── services/
│   ├── secretService.ts               # Core secret management
│   ├── apiKeyService.ts               # API key lifecycle management
│   └── encryptionService.ts           # Encryption utilities
├── middleware/
│   ├── auth.ts                        # Authentication middleware
│   ├── rateLimit.ts                   # Rate limiting
│   └── audit.ts                       # Audit logging middleware
├── routes/
│   ├── api-secrets.ts                 # Secret management endpoints
│   ├── api-keys.ts                    # API key endpoints
│   └── mcp-api-keys.ts                # MCP integration endpoints
├── database/
│   ├── schema.sql                     # Core database schema
│   ├── enterprise-secrets-schema.sql  # Enterprise features schema
│   ├── schema-api-keys.sql            # API key management schema
│   └── migrations/                    # Database migrations
├── types/
│   ├── auth.ts                        # Authentication types
│   └── secrets.ts                     # Secret management types
├── tests/
│   ├── unit/                          # Unit tests
│   ├── integration/                   # Integration tests
│   └── security/                      # Security-specific tests
├── scripts/
│   ├── setup.sh                       # Initial setup script
│   ├── migrate.sh                     # Database migration script
│   └── rotate-keys.sh                 # Key rotation script
└── examples/
    ├── basic-usage.ts                 # Basic usage examples
    ├── advanced-features.ts           # Advanced features
    └── mcp-integration.ts             # MCP integration examples
```

---

## ✨ Features

### 1. Secret Management
- **Secure Storage**: AES-256-GCM encryption with PBKDF2 key derivation
- **Version Control**: Complete version history with rollback capability
- **Expiration**: Automatic expiration and notification
- **Sharing**: Secure secret sharing with time-limited access
- **Tagging**: Organize secrets with tags and metadata
- **Multi-Environment**: Separate secrets for dev, staging, production

### 2. API Key Management
- **Lifecycle Management**: Create, rotate, revoke, and monitor API keys
- **Access Levels**: Public, authenticated, team, admin, enterprise
- **Key Types**: Support for various key types (API keys, OAuth tokens, certificates, SSH keys)
- **Usage Analytics**: Track usage patterns and detect anomalies
- **Rotation Policies**: Automatic key rotation with configurable intervals
- **Project Organization**: Organize keys by projects and teams

### 3. MCP Integration
- **Tool Registration**: Register AI tools with specific permissions
- **Access Requests**: Request-approval workflow for sensitive operations
- **Session Management**: Time-limited sessions with automatic expiration
- **Proxy Tokens**: Temporary tokens that map to actual secrets
- **Risk Assessment**: Automatic risk level assessment for tool access

### 4. Security Features
- **Encryption**: AES-256-GCM with authenticated encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Audit Logging**: Immutable, tamper-proof audit trails with HMAC signatures
- **Row-Level Security**: PostgreSQL RLS policies for data isolation
- **MFA Support**: Multi-factor authentication for sensitive operations
- **Rate Limiting**: Configurable rate limits per user/service account
- **IP Whitelisting**: Restrict access by IP address

### 5. Compliance Features
- **Audit Trails**: Complete audit history for compliance reporting
- **Data Retention**: Configurable retention policies
- **Access Reports**: Generate access reports for auditors
- **Encryption Reports**: Track encryption status of all secrets
- **Compliance Dashboard**: Real-time compliance status monitoring

---

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL 14+ (or Supabase account)
- Redis (optional, for rate limiting)

### As a Standalone Service

```bash
# Clone or copy the security-service folder
cd security-service

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate
# or
./scripts/migrate.sh

# Start the service
npm run start
# or
bun run start
```

### As a Module in Your Project

```bash
# Copy the security-service folder to your project
cp -r security-service /path/to/your/project/

# Install dependencies in your project
cd /path/to/your/project
npm install @supabase/supabase-js jsonwebtoken zod

# Import and use
import { SecretService, ApiKeyService } from './security-service/services';
```

---

## 🚀 Usage

### Basic Secret Management

```typescript
import { SecretService } from './security-service/services/secretService';

const secretService = new SecretService();

// Store a secret
await secretService.storeSecret('DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>

// Retrieve a secret
const dbUrl = await secretService.getSecret('DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>

// List all secrets
const secrets = await secretService.listSecrets(userId);
```

### API Key Management

```typescript
import { ApiKeyService } from './security-service/services/apiKeyService';

const apiKeyService = new ApiKeyService();

// Create an API key
const apiKey = await apiKeyService.createApiKey({
  name: 'Production API Key',
  value: 'sk_live_...',
  keyType: 'api_key',
  environment: 'production',
  projectId: 'project-uuid',
  rotationFrequency: 90
}, userId);

// Get API keys for a project
const keys = await apiKeyService.getApiKeys(organizationId, projectId);

// Rotate an API key
await apiKeyService.rotateApiKey(keyId, userId);
```

### MCP Integration

```typescript
import { ApiKeyService } from './security-service/services/apiKeyService';

const apiKeyService = new ApiKeyService();

// Register an MCP tool
const tool = await apiKeyService.registerMCPTool({
  toolId: 'claude-code-assistant',
  toolName: 'Claude Code Assistant',
  organizationId: 'org-uuid',
  permissions: {
    keys: ['GITHUB_TOKEN', 'AWS_ACCESS_KEY'],
    environments: ['development', 'staging'],
    maxConcurrentSessions: 3,
    maxSessionDuration: 900
  },
  autoApprove: false,
  riskLevel: 'medium'
}, userId);

// Request access to secrets
const requestId = await apiKeyService.createMCPAccessRequest({
  toolId: 'claude-code-assistant',
  organizationId: 'org-uuid',
  keyNames: ['GITHUB_TOKEN'],
  environment: 'development',
  justification: 'Need to access GitHub API for code review',
  estimatedDuration: 600
});

// Get proxy token (after approval)
const { proxyToken, expiresAt } = await apiKeyService.getProxyTokenForKey(
  sessionId,
  'GITHUB_TOKEN'
);
```

---

## 📚 API Reference

### Secret Management Endpoints

#### `POST /api/v1/secrets`
Store or update a secret.

**Request:**
```json
{
  "key": "DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  "value": "postgresql://<user>:<password>@<host>:<port>/<db>",
  "metadata": {
    "description": "Production database connection"
  },
  "tags": ["database", "production"],
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "secretId": "secret-uuid"
}
```

#### `GET /api/v1/secrets/:key`
Retrieve a secret value.

**Response:**
```json
{
  "key": "DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  "value": "postgresql://<user>:<password>@<host>:<port>/<db>",
  "metadata": { ... },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### API Key Management Endpoints

#### `POST /api/v1/api-keys`
Create a new API key.

#### `GET /api/v1/api-keys`
List all API keys for an organization.

#### `PUT /api/v1/api-keys/:keyId`
Update an API key.

#### `DELETE /api/v1/api-keys/:keyId`
Delete an API key.

#### `POST /api/v1/api-keys/:keyId/rotate`
Rotate an API key.

### MCP Integration Endpoints

#### `POST /api/v1/mcp/tools`
Register an MCP tool.

#### `POST /api/v1/mcp/access-requests`
Create an access request.

#### `POST /api/v1/mcp/sessions`
Create a session (after approval).

#### `GET /api/v1/mcp/proxy-token/:sessionId/:keyName`
Get a proxy token for a secret.

---

## 🔒 Best Practices

### 1. Secret Management
- **Never commit secrets to version control**
- **Use environment-specific secrets** (dev, staging, prod)
- **Rotate secrets regularly** (90 days recommended)
- **Use strong, unique secrets** for each service
- **Enable expiration** for temporary secrets
- **Audit secret access** regularly

### 2. API Key Management
- **Use least privilege principle** - grant minimum necessary permissions
- **Enable automatic rotation** for production keys
- **Monitor usage patterns** for anomaly detection
- **Revoke unused keys** immediately
- **Use different keys** for different environments
- **Document key purposes** in metadata

### 3. Access Control
- **Implement MFA** for sensitive operations
- **Use RBAC** to manage permissions
- **Review access logs** regularly
- **Implement IP whitelisting** for production
- **Use time-limited sessions** for MCP tools
- **Require approval** for high-risk operations

### 4. Encryption
- **Use strong encryption keys** (256-bit minimum)
- **Rotate encryption keys** periodically
- **Store keys securely** (use KMS or HSM)
- **Never log decrypted values**
- **Use authenticated encryption** (GCM mode)

### 5. Compliance
- **Maintain audit trails** for all operations
- **Generate compliance reports** regularly
- **Implement data retention policies**
- **Document security procedures**
- **Conduct regular security audits**
- **Train team members** on security practices

---

## 🚀 Future Improvements

### AI-Powered Security Enhancements (2024-2025)

#### 1. **AI-Driven Anomaly Detection**
- **ML-based access pattern analysis**: Detect unusual access patterns using machine learning
- **Behavioral biometrics**: Analyze user behavior to detect account takeovers
- **Threat intelligence integration**: Integrate with AI-powered threat feeds
- **Predictive security**: Predict and prevent security incidents before they occur

**Implementation:**
```typescript
// Future feature
const anomalyDetector = new AIAnomalyDetector({
  model: 'isolation-forest',
  sensitivity: 'high'
});

await anomalyDetector.analyzeAccessPattern(userId, accessLog);
```

#### 2. **Automated Secret Rotation with AI**
- **Smart rotation scheduling**: AI determines optimal rotation times based on usage
- **Automated credential generation**: Generate strong, context-aware credentials
- **Zero-downtime rotation**: AI orchestrates rotation across distributed systems
- **Dependency mapping**: Automatically identify and update dependent services

**Implementation:**
```typescript
// Future feature
const rotationOrchestrator = new AIRotationOrchestrator({
  strategy: 'zero-downtime',
  dependencyMapping: true
});

await rotationOrchestrator.rotateSecret('DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
```

#### 3. **Natural Language Security Policies**
- **Policy generation from descriptions**: "Only allow access to production secrets from office IPs during business hours"
- **Policy conflict detection**: AI identifies conflicting security rules
- **Policy optimization**: Suggest policy improvements based on usage patterns

**Implementation:**
```typescript
// Future feature
const policyGenerator = new NLPolicyGenerator();

const policy = await policyGenerator.generate(
  "Allow developers to access staging secrets but require MFA for production"
);
```

#### 4. **Quantum-Resistant Cryptography**
- **Post-quantum encryption algorithms**: Prepare for quantum computing threats
- **Hybrid encryption**: Combine classical and quantum-resistant algorithms
- **Crypto-agility**: Easy migration to new algorithms as standards evolve

**Standards:**
- NIST Post-Quantum Cryptography Standards (2024)
- CRYSTALS-Kyber for key encapsulation
- CRYSTALS-Dilithium for digital signatures

#### 5. **Federated Learning for Security**
- **Privacy-preserving threat detection**: Learn from multiple organizations without sharing data
- **Collaborative security**: Benefit from collective security intelligence
- **Decentralized model training**: Train security models across distributed systems

#### 6. **Blockchain-Based Audit Trails**
- **Immutable audit logs**: Store audit trails on blockchain for tamper-proof records
- **Smart contract policies**: Enforce security policies via smart contracts
- **Decentralized access control**: Distribute access control decisions

#### 7. **AI-Powered Compliance Automation**
- **Automated compliance reporting**: Generate compliance reports using AI
- **Regulatory change detection**: Monitor and adapt to new regulations
- **Compliance gap analysis**: Identify and remediate compliance gaps

#### 8. **Homomorphic Encryption**
- **Compute on encrypted data**: Perform operations without decrypting
- **Privacy-preserving analytics**: Analyze secret usage without exposing values
- **Secure multi-party computation**: Enable collaboration without data sharing

#### 9. **Biometric Authentication**
- **Passwordless authentication**: Use biometrics instead of passwords
- **Continuous authentication**: Verify identity throughout session
- **Multi-modal biometrics**: Combine face, voice, and behavioral biometrics

#### 10. **Zero-Trust Architecture**
- **Never trust, always verify**: Verify every access request
- **Micro-segmentation**: Isolate secrets at granular level
- **Continuous verification**: Re-verify access throughout session

### Emerging Technologies Integration

#### **Confidential Computing**
- Use Intel SGX, AMD SEV, or ARM TrustZone for hardware-based secret protection
- Process secrets in encrypted memory enclaves

#### **Secure Enclaves**
- Apple Secure Enclave, AWS Nitro Enclaves
- Hardware-isolated secret processing

#### **Differential Privacy**
- Add noise to analytics while preserving privacy
- Enable secure data sharing for research

#### **WebAuthn/FIDO2**
- Hardware security key support
- Phishing-resistant authentication

---

## 📊 Compliance Roadmap

### Q1 2024
- ✅ OWASP Top 10 compliance
- ✅ Basic SOC 2 controls
- ✅ GDPR data handling

### Q2 2024
- ⏳ Full SOC 2 Type II audit
- ⏳ ISO 27001 certification preparation
- ⏳ PCI DSS compliance (for payment secrets)

### Q3 2024
- ⏳ HIPAA compliance (for healthcare secrets)
- ⏳ FedRAMP compliance (for government use)
- ⏳ Quantum-resistant cryptography pilot

### Q4 2024
- ⏳ AI-powered anomaly detection
- ⏳ Blockchain audit trails
- ⏳ Zero-trust architecture implementation

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Security Vulnerabilities

If you discover a security vulnerability, please email security@lanonasis.com instead of using the issue tracker.

---

## 📄 License

This security service is part of the LanOnasis Enterprise Context Memory Service.
Licensed under MIT License. See [LICENSE](../LICENSE) for details.

---

## 📞 Support

- **Documentation**: [https://docs.lanonasis.com](https://docs.lanonasis.com)
- **Email**: support@lanonasis.com
- **Discord**: [Join our community](https://discord.gg/lanonasis)
- **GitHub Issues**: [Report bugs](https://github.com/lanonasis/enterprise-context/issues)

---

## 🙏 Acknowledgments

Built with:
- [Supabase](https://supabase.com) - Database and authentication
- [PostgreSQL](https://postgresql.org) - Database engine
- [Node.js](https://nodejs.org) - Runtime environment
- [TypeScript](https://typescriptlang.org) - Type safety

Inspired by:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
