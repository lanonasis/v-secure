# 📚 v-secure Documentation Index

**Complete guide to all v-secure documentation** - Start here!

---

## 🎯 Quick Navigation

### For New Users
1. **[ONBOARDING.md](./ONBOARDING.md)** ⭐ **START HERE**
   - How to get your API key
   - How to use it in any app
   - Complete integration examples
   - Troubleshooting guide

2. **[PACKAGES_QUICKSTART.md](./PACKAGES_QUICKSTART.md)** 📦
   - Published NPM packages overview
   - Quick installation guides
   - Code examples for each package
   - Integration patterns

### For Deployment
3. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** 🚀
   - Standalone deployment
   - Integration with existing projects
   - Production configuration
   - Monitoring setup

4. **[README.md](./README.md)** 📖
   - Full feature overview
   - Architecture details
   - Security standards
   - Future roadmap

### For Developers
5. **[auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md](./auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md)** 🔐
   - OAuth2 PKCE implementation
   - VSCode/CLI/Dashboard integration
   - Token management
   - Fallback strategies

6. **[auth-gateway-oauth2-pkce/README.md](./auth-gateway-oauth2-pkce/README.md)** 🏗️
   - OAuth2 PKCE reference
   - Database schema
   - Implementation checklist
   - Port mappings

---

## ❓ Common Questions

### "How do I use v-secure in my app?"

**Answer:** → Read [ONBOARDING.md](./ONBOARDING.md)

The same API key from the dashboard works everywhere:
```bash
# Get API key from dashboard
https://mcp.lanonasis.com/dashboard → Create API Key

# Use it in any request
curl https://mcp.lanonasis.com/api/v1/secrets \
  -H "x-api-key: lano_your_key_here"
```

---

### "Which NPM package should I install?"

**Answer:** → Read [PACKAGES_QUICKSTART.md](./PACKAGES_QUICKSTART.md)

| Need | Package |
|------|---------|
| OAuth authentication | `@lanonasis/oauth-client` |
| Encryption/crypto | `@onasis/security-sdk` |
| Data masking/PII | `@onasis/privacy-sdk` |
| Self-hosted service | `@lanonasis/security-service` |

---

### "How do I deploy v-secure?"

**Answer:** → Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

```bash
# Quick deployment
git clone https://github.com/lanonasis/v-secure.git
cd v-secure
npm install
cp .env.example .env
# Edit .env
npm run migrate
npm start
```

---

### "What's the difference between OAuth and API keys?"

**Answer:** → Read [ONBOARDING.md#understanding-authentication-methods](./ONBOARDING.md#understanding-authentication-methods)

| Method | Best For | Example |
|--------|----------|---------|
| **API Keys** | Backend services, SDKs | `x-api-key: lano_...` |
| **OAuth2 PKCE** | CLI, desktop apps | `Authorization: Bearer ...` |
| **Session Cookies** | Web dashboards | Automatic via cookies |

---

### "How do I integrate with VSCode/CLI/Dashboard?"

**Answer:** → Read [auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md](./auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md)

Complete code examples for:
- VSCode/Cursor extensions
- CLI tools
- Web dashboards
- SDKs
- REST APIs

---

## 📦 Package Documentation

### @lanonasis/oauth-client
- **Purpose:** OAuth + MCP connectivity for apps
- **Install:** `npm i @lanonasis/oauth-client`
- **Docs:** [PACKAGES_QUICKSTART.md#1-lanonasisoauth-client](./PACKAGES_QUICKSTART.md#1-lanonasisoauth-client)
- **Use Cases:** CLI tools, desktop apps, MCP integrations

### @onasis/security-sdk
- **Purpose:** Encryption and crypto utilities
- **Install:** `npm i @onasis/security-sdk`
- **Docs:** [PACKAGES_QUICKSTART.md#2-onassissecurity-sdk](./PACKAGES_QUICKSTART.md#2-onassissecurity-sdk)
- **Use Cases:** Encrypt secrets, generate keys, hash passwords

### @onasis/privacy-sdk
- **Purpose:** Data masking and PII protection
- **Install:** `npm i @onasis/privacy-sdk`
- **Docs:** [PACKAGES_QUICKSTART.md#3-onasisprivacy-sdk](./PACKAGES_QUICKSTART.md#3-onasisprivacy-sdk)
- **Use Cases:** Mask emails/phones, anonymize data, GDPR compliance

### @lanonasis/security-service
- **Purpose:** Main backend service and API
- **Install:** Self-hosted (see deployment guide)
- **Docs:** [README.md](./README.md)
- **Use Cases:** Complete security service deployment

---

## 🎓 Learning Path

### Beginner
1. Read [ONBOARDING.md](./ONBOARDING.md)
2. Get API key from dashboard
3. Try a simple API call
4. Install one package
5. Run first example

### Intermediate
1. Read [PACKAGES_QUICKSTART.md](./PACKAGES_QUICKSTART.md)
2. Choose packages for your use case
3. Implement OAuth flow OR use API key
4. Encrypt/decrypt secrets
5. Add logging with data masking

### Advanced
1. Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Self-host v-secure service
3. Implement OAuth2 PKCE
4. Set up monitoring
5. Configure compliance features

---

## 🔍 Documentation by Topic

### Authentication
- **API Keys:** [ONBOARDING.md#getting-your-api-key](./ONBOARDING.md#getting-your-api-key)
- **OAuth2 PKCE:** [auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md](./auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md)
- **Session Cookies:** [ONBOARDING.md#3-session-cookies](./ONBOARDING.md#3-session-cookies)

### Encryption
- **AES-256-GCM:** [PACKAGES_QUICKSTART.md#2-onassissecurity-sdk](./PACKAGES_QUICKSTART.md#2-onassissecurity-sdk)
- **Key Derivation:** [README.md#encryption](./README.md#encryption)
- **Key Rotation:** [PACKAGES_QUICKSTART.md#key-rotation](./PACKAGES_QUICKSTART.md#key-rotation)

### Integration Examples
- **Node.js Backend:** [ONBOARDING.md#example-1-nodejs-backend-service](./ONBOARDING.md#example-1-nodejs-backend-service)
- **React Frontend:** [ONBOARDING.md#example-2-react-frontend](./ONBOARDING.md#example-2-react-frontend)
- **Python Script:** [ONBOARDING.md#example-3-python-script](./ONBOARDING.md#example-3-python-script)
- **GitHub Actions:** [ONBOARDING.md#example-4-github-actions-cicd](./ONBOARDING.md#example-4-github-actions-cicd)
- **Docker:** [ONBOARDING.md#example-5-docker-container](./ONBOARDING.md#example-5-docker-container)

### Compliance
- **SOC 2:** [README.md#soc-2-type-ii](./README.md#soc-2-type-ii)
- **ISO 27001:** [README.md#iso-270012022](./README.md#iso-270012022)
- **GDPR:** [README.md#gdpr-compliance](./README.md#gdpr-compliance)
- **PCI DSS:** [README.md#pci-dss-40](./README.md#pci-dss-40)

---

## 🛠️ Troubleshooting Guides

### Installation Issues
- **NPM Package Not Found:** [PACKAGES_QUICKSTART.md#cannot-find-module](./PACKAGES_QUICKSTART.md#cannot-find-module)
- **TypeScript Errors:** Check `tsconfig.json` and package versions
- **Build Failures:** Ensure Node.js 18+ or Bun installed

### Authentication Issues
- **Invalid API Key:** [ONBOARDING.md#problem-unauthorized-error-401](./ONBOARDING.md#problem-unauthorized-error-401)
- **OAuth Flow Failed:** [auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md](./auth-gateway-oauth2-pkce/CLIENT_INTEGRATION_GUIDE.md)
- **Token Expired:** Implement token refresh flow

### API Issues
- **Secret Not Found:** [ONBOARDING.md#problem-secret-not-found-error-404](./ONBOARDING.md#problem-secret-not-found-error-404)
- **Rate Limiting:** [ONBOARDING.md#problem-rate-limiting-429](./ONBOARDING.md#problem-rate-limiting-429)
- **CORS Errors:** [ONBOARDING.md#problem-cors-error](./ONBOARDING.md#problem-cors-error)

---

## 📊 Documentation Files Overview

```
v-secure/
├── DOCUMENTATION_INDEX.md          ← You are here
├── ONBOARDING.md                   ← Start here for new users
├── PACKAGES_QUICKSTART.md          ← Published packages reference
├── README.md                        ← Full feature overview
├── DEPLOYMENT_GUIDE.md             ← Production deployment
├── SECURITY_STANDARDS.md           ← Compliance details (if exists)
└── auth-gateway-oauth2-pkce/
    ├── README.md                    ← OAuth2 PKCE reference
    ├── CLIENT_INTEGRATION_GUIDE.md  ← Client implementation
    ├── OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md
    └── PORT_MAPPING_COMPLETE.md
```

---

## 🚀 Quick Start Checklist

- [ ] Read [ONBOARDING.md](./ONBOARDING.md)
- [ ] Get API key from https://mcp.lanonasis.com/dashboard
- [ ] Store API key in `.env` file
- [ ] Install package: `npm i @lanonasis/oauth-client`
- [ ] Try first API call
- [ ] Read [PACKAGES_QUICKSTART.md](./PACKAGES_QUICKSTART.md)
- [ ] Choose authentication method (API key OR OAuth)
- [ ] Implement in your app
- [ ] Test in development
- [ ] Deploy to production
- [ ] Set up monitoring

---

## 💬 Getting Help

### Documentation
- Start: [ONBOARDING.md](./ONBOARDING.md)
- Packages: [PACKAGES_QUICKSTART.md](./PACKAGES_QUICKSTART.md)
- Deployment: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### Community
- **Discord:** https://discord.gg/lanonasis
- **GitHub Issues:** https://github.com/lanonasis/v-secure/issues
- **Email Support:** support@lanonasis.com

### Resources
- **API Docs:** https://docs.lanonasis.com
- **Dashboard:** https://mcp.lanonasis.com/dashboard
- **Examples:** [examples/](./examples/) directory

---

## 🔗 External Links

| Resource | URL |
|----------|-----|
| **Dashboard** | https://mcp.lanonasis.com/dashboard |
| **API Base URL** | https://mcp.lanonasis.com |
| **Auth Gateway** | https://auth.lanonasis.com |
| **Documentation** | https://docs.lanonasis.com |
| **GitHub** | https://github.com/lanonasis/v-secure |
| **NPM Packages** | https://www.npmjs.com/org/lanonasis |
| **Discord** | https://discord.gg/lanonasis |

---

## 📝 Quick Reference

### API Key Usage
```bash
# Header name (lowercase with hyphen)
x-api-key: lano_your_key_here

# Example request
curl https://mcp.lanonasis.com/api/v1/secrets \
  -H "x-api-key: lano_your_key_here"
```

### OAuth Token Usage
```bash
# Header name
Authorization: Bearer <access_token>

# Example request
curl https://mcp.lanonasis.com/api/v1/secrets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Environment Variables
```env
# API Access
VSECURE_API_KEY=lano_your_api_key_here
VSECURE_BASE_URL=https://mcp.lanonasis.com

# OAuth
OAUTH_CLIENT_ID=your_client_id
AUTH_BASE_URL=https://auth.lanonasis.com

# Security SDK
ONASIS_MASTER_KEY=64_character_hex_key
```

---

## ✨ What's New

### January 2025
- ✅ Published `@lanonasis/oauth-client` v1.0.1
- ✅ Published `@onasis/security-sdk` v1.0.0
- ✅ Published `@onasis/privacy-sdk` v1.0.0
- ✅ Created comprehensive onboarding guide
- ✅ Added package quickstart reference
- ✅ Documentation index for easy navigation

---

**Last Updated:** January 2025
**Maintained by:** LanOnasis Security Team

**Questions?** Start with [ONBOARDING.md](./ONBOARDING.md) or ask on [Discord](https://discord.gg/lanonasis)
