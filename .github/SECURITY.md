# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**IMPORTANT**: If you discover a security vulnerability, please **DO NOT** open a public issue.

### How to Report

Please report security vulnerabilities by email to:

**security@lanonasis.com**

### What to Include

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Initial Response**: Within 24 hours
- **Status Update**: Within 72 hours
- **Fix Timeline**: Varies by severity
  - **Critical**: Within 7 days
  - **High**: Within 14 days
  - **Medium**: Within 30 days
  - **Low**: Next minor release

### Security Update Process

1. Vulnerability is reported via security@lanonasis.com
2. Security team acknowledges receipt within 24 hours
3. Security team validates and assesses severity
4. Fix is developed and tested
5. Security advisory is prepared
6. Fix is released with security advisory
7. Public disclosure after users have had time to update

## Security Features

v-secure includes the following security features:

- **Encryption**: AES-256-GCM encryption at rest
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Audit Logging**: Immutable, tamper-proof audit trails with HMAC signatures
- **Access Control**: Role-based access control (RBAC) with row-level security
- **Authentication**: JWT-based authentication with MFA support
- **Rate Limiting**: Configurable rate limits to prevent abuse
- **Security Scanning**: Automated dependency scanning and security audits

## Compliance

v-secure is designed to support:

- **SOC 2 Type II** compliance
- **ISO 27001:2022** standards
- **GDPR** requirements
- **PCI DSS 4.0** (for payment-related secrets)
- **HIPAA** (for healthcare secrets)

## Security Best Practices

For security best practices and guidelines, see:

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Security section
- [README.md](../README.md) - Best Practices section
- [Documentation](https://docs.lanonasis.com)

## Hall of Fame

We recognize and thank security researchers who responsibly disclose vulnerabilities:

<!-- Security researchers will be listed here -->

---

**Last Updated**: December 2025
