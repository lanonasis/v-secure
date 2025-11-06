# Complete Port Mapping & Service Architecture

**Last Updated**: 2025-11-02
**Purpose**: Master reference for all service ports and authentication flows

---

## 🗺️ **Complete Port Map**

### **Production Services**

| Port | Service | Mode | Auth Method | Database | Purpose | Status |
|------|---------|------|-------------|----------|---------|--------|
| **4000** | **auth-gateway** | Cluster x2 | **PKCE + Legacy JWT** | **Neon** | **PRIMARY AUTH** | ✅ Active |
| **3005** | auth (quick-auth) | Cluster x1 | Legacy JWT only | Supabase | BACKUP AUTH | ⚠️ Standby |
| **3001** | mcp-core (HTTP) | Fork | API Key / JWT | Supabase | MCP HTTP API | ✅ Active |
| **3002** | mcp-core (WebSocket) | Fork | API Key / JWT | Supabase | MCP WebSocket | ✅ Active |
| **3003** | mcp-core (SSE) | Fork | API Key / JWT | Supabase | MCP Server-Sent Events | ✅ Active |
| **3006** | onasis | Cluster x1 | API Key / JWT | Supabase | Credit/Payment Gateway | ✅ Active |
| **7777** | vibe-mcp | Fork | API Key / JWT | Mixed | Unified MCP Gateway | ✅ Active |

### **Service Hierarchy**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PORT 4000: auth-gateway [PRIMARY] (Neon DB)                       │
│  ├─ OAuth2 PKCE Flow (Primary)                                     │
│  │  ├─ /oauth/authorize → User consent in browser                  │
│  │  ├─ /oauth/token → Exchange code for tokens                     │
│  │  ├─ /oauth/token (refresh) → Refresh expired tokens             │
│  │  └─ /oauth/revoke → Revoke tokens                               │
│  │                                                                  │
│  ├─ Legacy JWT Flow (Backup)                                       │
│  │  ├─ POST /v1/auth/login → Direct username/password              │
│  │  ├─ POST /v1/auth/register → New user registration              │
│  │  └─ POST /v1/auth/verify → Verify JWT token                     │
│  │                                                                  │
│  ├─ MCP Auth (Direct)                                               │
│  │  └─ POST /mcp/auth → MCP-specific authentication                │
│  │                                                                  │
│  ├─ CLI Auth (Direct)                                               │
│  │  └─ POST /auth/cli-login → CLI tool authentication              │
│  │                                                                  │
│  └─ Web Auth (Session-based)                                        │
│      ├─ GET /web/login → Login form                                 │
│      ├─ POST /web/login → Session login                             │
│      └─ GET /web/logout → Logout                                    │
│                                                                      │
│  PORT 3005: quick-auth [BACKUP] (Supabase)                         │
│  └─ Legacy JWT only (unchanged, standby mode)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          MCP SERVICES LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PORT 3001: mcp-core HTTP API                                       │
│  ├─ /health → Service health check                                  │
│  ├─ /api/v1/health → Health check (Supabase pattern)               │
│  ├─ /api/v1/tools → List available MCP tools                        │
│  └─ /api/v1/* → MCP tool operations                                 │
│                                                                      │
│  PORT 3002: mcp-core WebSocket                                      │
│  └─ ws://host:3002/ws → WebSocket MCP transport                     │
│                                                                      │
│  PORT 3003: mcp-core SSE                                            │
│  └─ /api/v1/events → Server-Sent Events stream                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       BUSINESS SERVICES LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PORT 3006: onasis                                                  │
│  ├─ Credit-as-a-Service (12 tools)                                 │
│  ├─ Payment gateway integrations                                    │
│  └─ Multi-currency support                                          │
│                                                                      │
│  PORT 7777: vibe-mcp                                                │
│  ├─ Unified MCP gateway (51 tools)                                 │
│  ├─ Neon database bridge                                            │
│  └─ App Store Connect integration                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 **Authentication Methods by Client Type**

### **1. VSCode/Cursor Extension**

**Recommended**: OAuth2 PKCE (Primary)

```
Flow:
1. Extension initiates OAuth flow
2. Opens browser to: https://mcp.lanonasis.com/oauth/authorize?...
3. User logs in via browser
4. Browser redirects back with authorization code
5. Extension exchanges code for tokens
6. Tokens stored in VSCode SecretStorage (encrypted)

Endpoints:
- Authorization: GET /oauth/authorize (port 4000)
- Token Exchange: POST /oauth/token (port 4000)
- Token Refresh: POST /oauth/token (port 4000)
- Token Revoke: POST /oauth/revoke (port 4000)

Benefits:
✅ Extension never sees password
✅ Secure token storage (SecretStorage)
✅ Standard OAuth2 flow
✅ Easy token revocation
```

**Fallback**: Legacy JWT

```
If PKCE fails, extension can fall back to:
POST https://mcp.lanonasis.com/v1/auth/login (port 4000)
{
  "email": "user@example.com",
  "password": "password",
  "client_id": "vscode-extension"
}
```

### **2. CLI Tools (onasis cli)**

**Recommended**: OAuth2 PKCE (Primary)

```
Flow:
1. CLI runs: onasis login
2. CLI starts local server on :3000
3. Opens browser to OAuth authorize endpoint
4. User logs in via browser
5. Browser redirects to http://localhost:3000/callback?code=...
6. CLI exchanges code for tokens
7. Tokens stored in ~/.onasis/config.json

Endpoints:
- Same as VSCode (port 4000)

Benefits:
✅ Familiar browser login
✅ More secure than typing password in terminal
```

**Fallback**: Legacy JWT (also available)

```
POST https://mcp.lanonasis.com/auth/cli-login (port 4000)
{
  "email": "user@example.com",
  "password": "password"
}
```

### **3. Windsurf IDE**

**Same as VSCode/Cursor** - OAuth2 PKCE primary, JWT fallback

### **4. Web Dashboard**

**Recommended**: Session-based Auth (port 4000)

```
Endpoints:
- GET  /web/login  → Login form
- POST /web/login  → Submit credentials, get session cookie
- GET  /web/logout → Logout

Session cookies:
- Stored in browser
- HttpOnly, Secure, SameSite
- Domain: *.lanonasis.com
```

### **5. REST API Clients**

**Recommended**: OAuth2 PKCE (server-to-server) or API Keys

```
For server-to-server:
- Use client_credentials grant type (to be implemented)
- Or use API keys (existing system)

For user-facing:
- OAuth2 PKCE flow
```

**Fallback**: Direct JWT

```
POST https://mcp.lanonasis.com/v1/auth/login (port 4000)
Get access_token, use in Authorization header
```

### **6. SDK Integrations**

**Recommended**: API Keys (existing) or OAuth2 PKCE

```
API Keys (current):
- x-api-key header with requests
- Managed via /api/v1/api-keys endpoints (port 3001)

OAuth2 (new):
- Implement OAuth2 in SDK
- Use PKCE for user-facing, client_credentials for server-to-server
```

---

## 🔄 **Authentication Flow Comparison**

### **OAuth2 PKCE (Primary - Port 4000)**

```
Advantages:
✅ Industry standard
✅ User never enters password in application
✅ Browser-based login (familiar)
✅ Secure token storage (SecretStorage, encrypted files)
✅ Server-side token revocation
✅ Complete audit trail
✅ Scope-based permissions
✅ Token refresh without re-login

Disadvantages:
⚠️ More complex implementation
⚠️ Requires browser for initial auth
⚠️ More moving parts (can fail)

Best For:
- VSCode/Cursor extensions
- CLI tools
- Windsurf IDE
- Third-party integrations
- User-facing applications
```

### **Legacy JWT (Backup - Port 4000 or 3005)**

```
Advantages:
✅ Simple implementation
✅ Works without browser
✅ Direct authentication
✅ Lower latency
✅ Proven, stable

Disadvantages:
⚠️ Application sees password
⚠️ Less secure token storage
⚠️ Manual token revocation
⚠️ No scope management
⚠️ Refresh requires password

Best For:
- Emergency access
- Development/testing
- Internal tools
- Automated scripts
- Fallback when PKCE unavailable
```

---

## 🗄️ **Database Architecture**

### **Neon Database (Port 4000 - auth-gateway)**

**Primary Tables:**
```sql
-- Existing (from your template)
users                    -- User accounts
sessions                 -- Active sessions
api_keys                 -- API key management
audit_log                -- Authentication audit trail

-- New OAuth2 PKCE Tables
oauth_clients            -- Registered OAuth clients
oauth_authorization_codes -- Short-lived auth codes
oauth_tokens             -- Access & refresh tokens
oauth_audit_log          -- OAuth-specific audit
```

**Your Existing Template Support:**
- ✅ Users table (unchanged)
- ✅ Sessions table (enhanced with OAuth sessions)
- ✅ API keys table (unchanged)
- ✅ Audit log (enhanced with OAuth events)

**All existing clients (CLI, VSCode, Dashboard, SDK, REST API) continue to work with the same database structure!**

### **Supabase Database (Ports 3005, 3001, 3006)**

**Legacy Auth & MCP Tools:**
```
- auth.users (Supabase Auth)
- memory_entries (MCP Core)
- Credit-as-a-Service tables (onasis)
```

---

## 🚦 **Traffic Routing (Nginx)**

```
Domain: mcp.lanonasis.com (443 → nginx → services)

/oauth/*         → 4000 (auth-gateway) [OAuth2 PKCE]
/auth/*          → 4000 (auth-gateway) [CLI/MCP auth]
/v1/auth/*       → 4000 (auth-gateway) [REST API auth]
/web/*           → 4000 (auth-gateway) [Web dashboard]
/admin/*         → 4000 (auth-gateway) [Admin panel]

/health          → 3001 (mcp-core)
/api/v1/health   → 3001 (mcp-core)
/api/v1/*        → 3001 (mcp-core HTTP API)
/api/v1/events   → 3003 (mcp-core SSE)
/ws              → 3002 (mcp-core WebSocket)

Domain: auth.lanonasis.com (443 → nginx → auth-gateway)
/*               → 4000 (auth-gateway) [All auth operations]
```

---

## 📊 **Client → Service → Database Flow**

### **Example: VSCode Extension with OAuth2 PKCE**

```
[VSCode Extension]
    ↓ (Browser-based OAuth)
[Port 4000: auth-gateway]
    ↓ (PKCE validation)
[Neon Database: oauth_tokens, users]
    ↓ (JWT issued)
[VSCode Extension stores in SecretStorage]
    ↓ (API calls with Bearer token)
[Port 3001: mcp-core] → [Supabase: memory_entries]
```

### **Example: CLI Tool with Legacy JWT (Fallback)**

```
[CLI Tool]
    ↓ (POST /auth/cli-login)
[Port 4000: auth-gateway]
    ↓ (Validate credentials)
[Neon Database: users, sessions]
    ↓ (JWT issued)
[CLI stores in ~/.onasis/config.json]
    ↓ (API calls with Bearer token)
[Port 3001: mcp-core] → [Supabase: memory_entries]
```

### **Example: Dashboard with Session Auth**

```
[Browser]
    ↓ (POST /web/login)
[Port 4000: auth-gateway]
    ↓ (Session cookie set)
[Neon Database: users, sessions]
    ↓ (Session validated on each request)
[Dashboard pages served]
```

---

## 🔒 **Security Configuration**

### **CORS (All Services)**

```javascript
Allowed Origins:
- https://dashboard.lanonasis.com
- https://mcp.lanonasis.com
- https://docs.lanonasis.com
- vscode://lanonasis.mcp-client
- http://localhost:* (development)
```

### **Rate Limiting**

```
OAuth Endpoints (port 4000):
- /oauth/authorize: 10 req/min per IP
- /oauth/token: 10 req/min per IP
- /oauth/revoke: 20 req/min per IP

Auth Endpoints (port 4000):
- /v1/auth/login: 5 req/min per IP
- /v1/auth/register: 3 req/min per IP

MCP Endpoints (port 3001):
- /api/v1/*: 100 req/min per token
```

---

## 📝 **Quick Reference**

### **Health Checks (All Services)**

```bash
# Auth Gateway (PRIMARY)
curl https://mcp.lanonasis.com/health        # or /api/v1/health
curl https://auth.lanonasis.com/health

# MCP Core
curl https://mcp.lanonasis.com/health        # port 3001
curl https://mcp.lanonasis.com/api/v1/health

# Check specific port
curl http://localhost:4000/health  # auth-gateway
curl http://localhost:3005/health  # quick-auth (backup)
curl http://localhost:3001/health  # mcp-core HTTP
```

### **Service Status**

```bash
pm2 list                  # All services
pm2 show auth-gateway     # Primary auth (port 4000)
pm2 show auth             # Backup auth (port 3005)
pm2 show mcp-core         # MCP services (3001/3002/3003)
pm2 show onasis           # Business services (3006)
```

---

## ✅ **Summary: Your Existing Template is Preserved**

**What Stays the Same:**
- ✅ All database tables (users, sessions, api_keys, etc.)
- ✅ All existing authentication methods (JWT, API keys)
- ✅ All client applications work unchanged
- ✅ CLI, VSCode, Dashboard, SDK, REST API all compatible
- ✅ Port 3005 (quick-auth) remains as backup

**What's Added:**
- ✅ OAuth2 PKCE endpoints on port 4000 (new, optional)
- ✅ 4 new OAuth tables (oauth_clients, oauth_codes, oauth_tokens, oauth_audit_log)
- ✅ Enhanced security for extensions
- ✅ Browser-based login option
- ✅ Better token management

**Migration Path:**
- ✅ OAuth2 PKCE is **additive**, not replacement
- ✅ Clients can migrate to PKCE gradually
- ✅ Legacy JWT always available as fallback
- ✅ No breaking changes to existing systems

---

**Your template-based architecture is fully preserved. OAuth2 PKCE extends it, doesn't replace it!** ✅
