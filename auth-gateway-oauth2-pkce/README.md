# Auth Gateway OAuth2 PKCE Implementation Reference

This reference folder contains all the files needed to implement OAuth2 PKCE authentication for the auth-gateway service (port 4000). These files were created from the successful auth-gateway deployment and serve as the blueprint for implementing modern OAuth2 authentication.

## 📁 Files in This Reference

### 1. **002_oauth2_pkce.sql** (Database Migration)
**Purpose**: Complete database schema for OAuth2 PKCE flow
**Use When**: Setting up OAuth2 tables in the Neon database
**Contains**:
- `oauth_clients` table with pre-seeded clients (cursor-extension, onasis-cli)
- `oauth_authorization_codes` table with PKCE challenge support
- `oauth_tokens` table with token rotation tracking
- `oauth_audit_log` table for complete audit trail
- Helper functions for token cleanup and maintenance
- Triggers for automatic timestamp updates

**Run This First**: Apply this migration before implementing endpoints

```bash
# Apply to auth-gateway database (Neon)
psql $NEON_DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
```

---

### 2. **OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md** (Developer Guide)
**Purpose**: Complete technical guide for implementing OAuth2 PKCE endpoints
**Use When**: Writing the actual endpoint code in auth-gateway
**Contains**:
- OAuth2 flow architecture diagram
- All 4 endpoint specifications with request/response examples
- PKCE validation logic (code_verifier + code_challenge)
- Token generation and rotation strategies
- Error handling patterns
- Security best practices

**Start Here**: Read this before writing any OAuth2 code

---

### 3. **PORT_MAPPING_COMPLETE.md** (Infrastructure Map)
**Purpose**: Master reference for all service ports and authentication flows
**Use When**: Need to understand where services are running and how they interact
**Contains**:
- Complete port allocation map (3001-7777)
- Service hierarchy and dependencies
- Authentication methods by client type (CLI, VSCode, Dashboard, SDK)
- Database architecture (Neon vs Supabase)
- Domain mappings and SSL configuration

**Critical Info**: Shows auth-gateway on port 4000 as PRIMARY auth service

---

### 4. **CLIENT_INTEGRATION_GUIDE.md** (Client Implementation)
**Purpose**: Shows how all existing clients integrate with PKCE + legacy support
**Use When**: Building or updating client applications (CLI, VSCode extension, SDKs)
**Contains**:
- VSCode Extension PKCE flow example
- CLI legacy JWT flow example
- Dashboard web authentication flow
- SDK integration patterns
- Fallback strategy (PKCE primary → JWT backup)

**Important**: Preserves existing database template while adding modern OAuth2

---

### 5. **IMPLEMENTATION_CHECKLIST.md** (Step-by-Step Plan)
**Purpose**: Complete implementation checklist aligned with existing database template
**Use When**: Planning the OAuth2 PKCE rollout
**Contains**:
- Phase 1: Database preparation
- Phase 2: Endpoint implementation
- Phase 3: Client updates
- Phase 4: Testing & validation
- Phase 5: Deployment & monitoring
- Rollback procedures

**Follow This**: Step-by-step guide to prevent going "off rail"

---

## 🎯 Quick Start: How to Use This Reference

### For Implementing OAuth2 PKCE from Scratch:

1. **Read the Implementation Guide First**
   ```bash
   cat OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md
   ```
   Understand the OAuth2 flow and endpoint requirements

2. **Apply the Database Migration**
   ```bash
   # Connect to your Neon database
   psql $NEON_DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
   ```

3. **Review Port Mappings**
   ```bash
   cat PORT_MAPPING_COMPLETE.md
   ```
   Confirm auth-gateway is on port 4000 and understand the service architecture

4. **Implement Endpoints Using the Checklist**
   ```bash
   cat IMPLEMENTATION_CHECKLIST.md
   ```
   Follow the step-by-step plan to implement all 4 OAuth2 endpoints

5. **Update Clients Using Integration Guide**
   ```bash
   cat CLIENT_INTEGRATION_GUIDE.md
   ```
   Update VSCode extension, CLI, dashboard to use PKCE flow

### For Quick Reference During Development:

- **"What's the authorize endpoint spec?"** → `OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md` (Section 3.1)
- **"Which port does auth-gateway run on?"** → `PORT_MAPPING_COMPLETE.md` (Section 2)
- **"How do I validate PKCE challenge?"** → `OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md` (Section 4.2)
- **"What fields are in oauth_tokens table?"** → `002_oauth2_pkce.sql` (Line 60-80)
- **"How does the VSCode extension integrate?"** → `CLIENT_INTEGRATION_GUIDE.md` (Section 2.1)

---

## 🏗️ Architecture Overview

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Client (VSCode/CLI/Dashboard)                                   │
│         │                                                         │
│         │ OAuth2 PKCE Flow (PRIMARY)                            │
│         ▼                                                         │
│  auth-gateway:4000 ──────────── Neon PostgreSQL                 │
│         │                              ↑                          │
│         │ Fallback to JWT (BACKUP)    │ oauth_clients           │
│         │                              │ oauth_authorization_codes│
│         ▼                              │ oauth_tokens            │
│  quick-auth:3005 ──────────── Supabase PostgreSQL              │
│                                         │ (legacy tables)        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **PKCE is Primary**: All new clients should use OAuth2 PKCE flow first
2. **JWT is Fallback**: If PKCE fails, clients can fall back to legacy JWT
3. **Template Preservation**: Existing database template structure is maintained
4. **Seamless Integration**: CLI, VSCode, Windsurf, Dashboard, SDK all fit into the same template

---

## 🔐 Security Notes

### Pre-seeded OAuth Clients

The migration includes two pre-configured OAuth clients:

1. **cursor-extension**
   - Client ID: `cursor-extension`
   - Requires PKCE: YES
   - Allowed Methods: S256 only (SHA256 hashing)
   - Redirect URIs: vscode://lanonasis.cursor, http://localhost:3000/callback

2. **onasis-cli**
   - Client ID: `onasis-cli`
   - Requires PKCE: YES
   - Allowed Methods: S256 only
   - Redirect URIs: http://localhost:8080/callback, urn:ietf:wg:oauth:2.0:oob

### Important Security Rules

- ✅ **Always validate PKCE**: Verify `code_verifier` matches `code_challenge`
- ✅ **Short-lived codes**: Authorization codes expire in 10 minutes
- ✅ **Token rotation**: Refresh tokens are rotated on each use
- ✅ **Audit logging**: All OAuth actions are logged to `oauth_audit_log`
- ⚠️ **No client secrets**: Public clients (CLI, extensions) use PKCE instead

---

## 📊 Database Tables Reference

### Quick Table Overview

```sql
oauth_clients                    -- Registered applications
├── client_id (primary key)
├── client_name
├── require_pkce (default: true)
├── allowed_code_challenge_methods (default: ['S256'])
└── allowed_redirect_uris (JSONB array)

oauth_authorization_codes        -- Temporary codes for token exchange
├── code (primary key)
├── client_id (foreign key)
├── user_id (foreign key to users table)
├── code_challenge & code_challenge_method (PKCE)
├── expires_at (10 minutes from creation)
└── used_at (NULL until exchanged)

oauth_tokens                     -- Access & refresh tokens
├── id (primary key)
├── client_id (foreign key)
├── user_id (foreign key)
├── access_token & refresh_token
├── access_token_expires_at (1 hour)
├── refresh_token_expires_at (30 days)
└── previous_refresh_token (for rotation tracking)

oauth_audit_log                  -- Complete audit trail
├── event_type (authorize, token_issued, token_refreshed, etc.)
├── client_id, user_id
├── ip_address, user_agent
└── metadata (JSONB for extra context)
```

---

## 🚀 Deployment Checklist

Before deploying OAuth2 PKCE to production:

- [ ] Database migration applied to Neon
- [ ] All 4 endpoints implemented and tested
- [ ] PKCE validation working (code_verifier matches code_challenge)
- [ ] Token expiration and cleanup jobs running
- [ ] Audit logging confirmed operational
- [ ] VSCode extension updated to use PKCE flow
- [ ] CLI fallback to legacy JWT tested
- [ ] Nginx routing to port 4000 confirmed
- [ ] SSL certificates valid for auth.lanonasis.com
- [ ] Health endpoints responding: `/health` and `/api/v1/health`

---

## 🆘 Troubleshooting

### Common Issues

**Q: "VSCode extension getting 404 on /oauth/authorize"**
A: Endpoint not implemented yet. See `OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md` Section 3.1

**Q: "PKCE validation failing with 'invalid_grant'"**
A: Check that `SHA256(code_verifier)` matches stored `code_challenge`. See Section 4.2

**Q: "Which database do I use - Neon or Supabase?"**
A: Auth-gateway uses **Neon** (primary). Supabase is legacy backup. See `PORT_MAPPING_COMPLETE.md`

**Q: "Can I discard the old structure?"**
A: **NO**. User quote: "i cant discard the old stucture because i hv built an entire database off from that template so cli, vscode, windsurf, dashboard, sdk, resp-api, and any other client will just fit seamlessly into the template where they belong"

---

## 📞 Contact & Support

This reference was created as part of the auth-gateway infrastructure preparation.

**Related Documentation:**
- `/opt/lanonasis/vps-inventory-20250125.md` - Complete VPS infrastructure
- `/opt/lanonasis/PM2-PATHS-VISUAL.txt` - PM2 service path mappings
- `/opt/lanonasis/agents.md` - Agent briefing document

**Git Repository:**
- Location: `/opt/lanonasis/mcp-core`
- Reference Path: `reference/auth-gateway-oauth2-pkce/`

---

## 📝 Version History

- **2025-11-02**: Initial reference folder created
  - All 5 implementation files copied from auth-gateway preparation
  - Port mappings finalized (auth-gateway on 4000, mcp-core on 3001-3003)
  - Database migration tested and verified
  - PKCE flow design completed

---

## ⚡ TL;DR - Start Here

1. **Read**: `OAUTH2_PKCE_IMPLEMENTATION_GUIDE.md` (understand the flow)
2. **Apply**: `002_oauth2_pkce.sql` (set up the database)
3. **Check**: `PORT_MAPPING_COMPLETE.md` (confirm port 4000)
4. **Follow**: `IMPLEMENTATION_CHECKLIST.md` (step-by-step implementation)
5. **Integrate**: `CLIENT_INTEGRATION_GUIDE.md` (update your clients)

**Goal**: Implement OAuth2 PKCE as PRIMARY authentication method while keeping legacy JWT as FALLBACK, preserving your existing database template structure.

---

**Last Updated**: 2025-11-02
**Status**: ✅ Ready for implementation
**Next Step**: Apply database migration to Neon and start implementing endpoints
