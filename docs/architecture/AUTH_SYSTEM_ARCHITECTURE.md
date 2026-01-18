# Lan Onasis Authentication System Architecture

**Document Version**: 1.0
**Last Updated**: 2026-01-17T19:30:00Z
**Author**: System Documentation

---

## Table of Contents
1. [Auth Flow](#1-auth-flow)
2. [Event Source](#2-event-source)
3. [Storage Locations](#3-storage-locations)
4. [Platform Usage Routing](#4-platform-usage-routing)
5. [Query Endpoints per Database](#5-query-endpoints-per-database)
6. [Test Examples](#6-test-examples)
7. [Platform Ecosystem Context](#7-platform-ecosystem-context)
8. [Original Plan vs Current State](#8-original-plan-vs-current-state)

---

## 1. Auth Flow

### Authentication Methods (Priority Order)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REQUEST ARRIVES                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PRIORITY 1: SSO Cookie (lanonasis_session)                             │
│  ─────────────────────────────────────────                              │
│  • Check req.cookies.lanonasis_session                                   │
│  • Verify JWT signature                                                  │
│  • Check expiration                                                      │
│  • If valid: req.user = payload, req.scopes = ['*']                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ Not found or invalid
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PRIORITY 2: Bearer Token (Authorization header)                         │
│  ───────────────────────────────────────────────                        │
│  • Extract from: Authorization: Bearer <token>                          │
│  • Verify JWT signature                                                  │
│  • If valid: req.user = payload, req.scopes = ['*']                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ Not found or invalid
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PRIORITY 3: API Key (X-API-Key header)                                  │
│  ──────────────────────────────────────                                 │
│  • Extract from: X-API-Key: <hashed_key>                                │
│  • Validate against security_service.api_keys (Neon)                    │
│  • Fetch user details from Main DB (Supabase)                           │
│  • If valid: req.user = payload, req.scopes = validation.permissions    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ Not found or invalid
                                    ▼
                    ┌───────────────────────────────┐
                    │  401 Unauthorized Response    │
                    └───────────────────────────────┘
```

### Login Flow

```
┌──────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│   Browser    │────>│  Main DB (Supabase)     │────>│  Set Cookies     │
│   /login     │     │  auth.signInWithPassword │     │  lanonasis_session│
│              │     │  or OAuth provider       │     │  lanonasis_user   │
└──────────────┘     └─────────────────────────┘     └──────────────────┘
       │                                                      │
       │                  Cross-subdomain SSO                 │
       ▼                  (domain: .lanonasis.com)            ▼
┌──────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│   Any App    │────>│  Auth-Gateway Middleware │────>│  Validated User  │
│   Request    │     │  checkSSOCookie()        │     │  req.user set    │
└──────────────┘     └─────────────────────────┘     └──────────────────┘
```

### Cookie Structure

| Cookie Name | Type | Content | Scope |
|-------------|------|---------|-------|
| `lanonasis_session` | HttpOnly | JWT token | `.lanonasis.com` |
| `lanonasis_user` | Readable | JSON user metadata | `.lanonasis.com` |

### Key Files
- **Middleware**: `middleware/auth.ts:19-33` (checkSSOCookie)
- **Middleware**: `middleware/auth.ts:43-114` (requireAuth)
- **Cookie Utils**: `packages/shared-auth/src/server/cookie-utils-server.ts`

---

## 2. Event Source

### Event-Driven Architecture (CQRS Pattern)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         EVENT FLOW                                      │
└────────────────────────────────────────────────────────────────────────┘

  Authentication Action          Event Store              Outbox Pattern
  ──────────────────────        ───────────────         ────────────────

  ┌─────────────────┐           ┌─────────────────┐     ┌─────────────────┐
  │ User Login      │──────────>│ auth_gateway.   │────>│ auth_gateway.   │
  │ User Signup     │  write    │ events          │     │ outbox          │
  │ Token Refresh   │           │ (1954 events)   │     │ (1874 pending)  │
  │ OAuth Grant     │           └─────────────────┘     └─────────────────┘
  └─────────────────┘                   │                       │
                                        │                       │
                                        ▼                       ▼
                               ┌─────────────────┐     ┌─────────────────┐
                               │ Event Replay    │     │ Outbox Forwarder│
                               │ (Projections)   │     │ (Background)    │
                               └─────────────────┘     └─────────────────┘
                                                               │
                                                               ▼
                                                       ┌─────────────────┐
                                                       │ External Systems│
                                                       │ (Supabase, etc) │
                                                       └─────────────────┘
```

### Event Types

| Event Type | Aggregate | Description |
|------------|-----------|-------------|
| `user.created` | user | New user registration |
| `user.authenticated` | session | Successful login |
| `session.created` | session | New session started |
| `session.refreshed` | session | Token refresh |
| `oauth.code_issued` | oauth | Authorization code generated |
| `oauth.token_issued` | oauth | Access token generated |

### Key Files
- **Event Service**: `services/event.service.ts`
- **Outbox Forwarder**: `workers/outbox-forwarder.ts`
- **Event Store**: Auth-Gateway Supabase `auth_gateway.events`
- **Outbox**: Auth-Gateway Supabase `auth_gateway.outbox`

---

## 3. Storage Locations

### Three-Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STORAGE TOPOLOGY                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN DB (Supabase) - SOURCE OF TRUTH FOR AUTHENTICATION                │
│  ══════════════════════════════════════════════════════                 │
│  Project: mxtsdgkwzjzlttpotole.supabase.co                              │
│  MCP Tool: mcp__supabase__*                                             │
│                                                                          │
│  Tables:                                                                 │
│  ├── auth.users (16 users) - Credentials, OAuth identities              │
│  ├── auth.identities - OAuth provider links                             │
│  ├── auth.sessions - Supabase auth sessions                             │
│  └── public.sync_config - Sync configuration                            │
│                                                                          │
│  Edge Functions:                                                         │
│  └── batch-sync-users (v9) - Sync to Auth-Gateway                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (Webhook Secret)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTH-GATEWAY DB (Supabase) - EDGE FUNCTIONS & OAUTH INFRASTRUCTURE     │
│  ═══════════════════════════════════════════════════════════════════    │
│  Project: ptnrwrgzrsbocgxlpvhd.supabase.co                              │
│  MCP Tool: mcp__supabase2__*                                            │
│                                                                          │
│  Tables (OAuth/Events only):                                             │
│  ├── auth_gateway.oauth_clients (21 clients)                            │
│  ├── auth_gateway.oauth_authorization_codes (193 codes)                 │
│  ├── auth_gateway.oauth_tokens (380 tokens)                             │
│  ├── auth_gateway.events (1954 events)                                  │
│  ├── auth_gateway.outbox (1874 pending)                                 │
│  ├── auth_gateway.admin_override (3 admins)                             │
│  └── auth_gateway.user_accounts (0 - NOT USED, see Neon)                │
│                                                                          │
│  Edge Functions:                                                         │
│  ├── receive-user-sync (v7) - Receives users, writes to NEON            │
│  └── batch-sync-to-neon (v8) - Sync to Neon                             │
│                                                                          │
│  IMPORTANT: DATABASE_URL env var points to Neon, not this DB!           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Direct Postgres (DATABASE_URL)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NEON DB - USER METADATA & SESSION STORAGE                              │
│  ═════════════════════════════════════════                              │
│  Host: ep-snowy-surf-adqqsawd-pooler.c-2.us-east-1.aws.neon.tech        │
│  Database: neondb                                                        │
│  User: neondb_owner                                                      │
│                                                                          │
│  Tables:                                                                 │
│  ├── auth_gateway.user_accounts (29 users) - Synced user metadata       │
│  ├── auth_gateway.sessions - Active sessions                            │
│  ├── security_service.api_keys (55 keys) - API key storage              │
│  ├── security_service.users (16 users) - Security service users         │
│  └── security_service.organizations (16 orgs)                           │
│                                                                          │
│  Accessed via:                                                           │
│  └── Edge function DATABASE_URL environment variable                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### User Sync Pipeline

```
pg_cron (0 */6 * * *)          pg_cron (15 */6 * * *)
        │                               │
        ▼                               ▼
┌───────────────┐               ┌───────────────┐
│   Main DB     │──HTTP POST───>│ Auth-Gateway  │──Postgres──>│   Neon DB   │
│  auth.users   │  (16 users)   │receive-user-  │  (29 users) │user_accounts│
│               │               │sync edge fn   │             │             │
└───────────────┘               └───────────────┘             └─────────────┘
```

---

## 4. Platform Usage Routing

### Original Plan (unified-router.js)

The original vision was a unified router that:
- Routes all requests through single endpoint
- Masks vendor information for privacy
- Strips PII before forwarding
- Provides service discovery

```javascript
// Original SERVICE_ROUTES from unified-router.js
const SERVICE_ROUTES = {
  'ai-chat': { path: '/functions/v1/ai-chat' },
  'text-to-speech': { path: '/functions/v1/elevenlabs-tts' },
  'speech-to-text': { path: '/functions/v1/elevenlabs-stt' },
  'transcribe': { path: '/functions/v1/whisper-transcribe' },
  'extract-tags': { path: '/functions/v1/extract-tags' },
  'generate-summary': { path: '/functions/v1/generate-summary' },
  'generate-embedding': { path: '/functions/v1/generate-embedding' },
  'mcp-handler': { path: '/functions/v1/mcp-handler' }
};
```

### Current Platform Routing

| Platform | Auth Method | Database | Endpoint |
|----------|-------------|----------|----------|
| Web Apps | SSO Cookie | Main DB (auth) → Neon (sessions) | Auth-Gateway Express |
| CLI Tools | Bearer Token / OAuth PKCE | Main DB (auth) → Neon (sessions) | Auth-Gateway Express |
| MCP Clients | OAuth PKCE | Auth-Gateway (oauth_clients) | `/oauth/authorize`, `/oauth/token` |
| API Consumers | API Key | Neon (api_keys validation) | Auth-Gateway Express |
| IDE Extensions | OAuth PKCE | Auth-Gateway (oauth_clients) | `/oauth/device/code` |

### Request Routing Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REQUEST ROUTING                                  │
└─────────────────────────────────────────────────────────────────────────┘

  Endpoint                     Handler                    Database(s)
  ────────                     ───────                    ───────────

  POST /auth/login          -> auth.controller.ts      -> Main DB (auth)
  POST /auth/register       -> auth.controller.ts      -> Main DB (auth)
  POST /auth/refresh        -> auth.controller.ts      -> Main DB + Neon

  GET  /oauth/authorize     -> oauth.routes.ts         -> Auth-Gateway (oauth_clients)
  POST /oauth/token         -> oauth.routes.ts         -> Auth-Gateway (oauth_tokens)
  POST /oauth/device/code   -> oauth.routes.ts         -> Auth-Gateway (oauth_codes)

  GET  /api/keys            -> api-key.routes.ts       -> Neon (api_keys)
  POST /api/keys            -> api-key.routes.ts       -> Neon (api_keys)

  GET  /sessions            -> session.controller.ts   -> Neon (sessions)
  DELETE /sessions/:id      -> session.controller.ts   -> Neon (sessions)

  GET  /health              -> index.ts                -> All DBs (health check)
```

---

## 5. Query Endpoints per Database

### Main DB (mxtsdgkwzjzlttpotole.supabase.co)

**MCP Tool**: `mcp__supabase__execute_sql`

```sql
-- User authentication data
SELECT id, email, raw_app_meta_data->>'provider' as provider
FROM auth.users;

-- User identities (OAuth links)
SELECT user_id, provider, identity_data
FROM auth.identities;

-- Sync configuration
SELECT * FROM public.sync_config;
```

**Edge Function Invocation**:
```bash
curl -X POST "https://mxtsdgkwzjzlttpotole.supabase.co/functions/v1/batch-sync-users" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <WEBHOOK_SECRET>"
```

### Auth-Gateway DB (ptnrwrgzrsbocgxlpvhd.supabase.co)

**MCP Tool**: `mcp__supabase2__execute_sql`

```sql
-- OAuth clients
SELECT client_id, client_name, status, allowed_scopes
FROM auth_gateway.oauth_clients;

-- OAuth tokens
SELECT token_type, client_id, user_id, expires_at
FROM auth_gateway.oauth_tokens WHERE revoked = false;

-- Events (CQRS)
SELECT event_type, aggregate_type, occurred_at
FROM auth_gateway.events ORDER BY occurred_at DESC LIMIT 10;

-- Outbox status
SELECT status, COUNT(*) FROM auth_gateway.outbox GROUP BY status;

-- Admin accounts
SELECT email, bypass_all_checks FROM auth_gateway.admin_override;
```

**Edge Function Invocation**:
```bash
# Receive user sync
curl -X POST "https://ptnrwrgzrsbocgxlpvhd.supabase.co/functions/v1/receive-user-sync" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <WEBHOOK_SECRET>" \
  -d '{"users": [...]}'

# Debug database connection
curl -X POST "https://ptnrwrgzrsbocgxlpvhd.supabase.co/functions/v1/receive-user-sync" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <WEBHOOK_SECRET>" \
  -d '{"debug": true}'
```

### Neon DB (ep-snowy-surf-adqqsawd-pooler)

**Access**: Via Auth-Gateway edge functions (DATABASE_URL)

```sql
-- Synced user accounts
SELECT user_id, email, provider, updated_at
FROM auth_gateway.user_accounts;

-- Active sessions
SELECT id, user_id, platform, expires_at
FROM auth_gateway.sessions WHERE expires_at > NOW();

-- API keys
SELECT name, user_id, is_active, last_used
FROM security_service.api_keys;

-- Organizations
SELECT id, name, plan FROM security_service.organizations;
```

**Direct Connection** (from edge function):
```typescript
import * as postgres from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const DATABASE_URL = Deno.env.get('DATABASE_URL')!;
const pool = new postgres.Pool(DATABASE_URL, 3, true);
const client = await pool.connect();

const result = await client.queryObject`
  SELECT * FROM auth_gateway.user_accounts LIMIT 10
`;
```

---

## 6. Test Examples

### Test SSO Cookie Authentication

```bash
# 1. Login to get cookies (via browser or API)
curl -X POST "https://api.lanonasis.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' \
  -c cookies.txt

# 2. Make authenticated request with cookies
curl "https://api.lanonasis.com/api/protected-resource" \
  -b cookies.txt
```

### Test Bearer Token Authentication

```bash
# Use JWT token from login response
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl "https://api.lanonasis.com/api/protected-resource" \
  -H "Authorization: Bearer $TOKEN"
```

### Test API Key Authentication

```bash
# Use API key from security_service.api_keys
API_KEY="sk_live_..."

curl "https://api.lanonasis.com/api/protected-resource" \
  -H "X-API-Key: $API_KEY"
```

### Test OAuth PKCE Flow (CLI/IDE)

```bash
# 1. Generate PKCE verifier and challenge
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d '=/+')
CODE_CHALLENGE=$(echo -n $CODE_VERIFIER | openssl dgst -sha256 -binary | base64 | tr -d '=/+' | tr '/+' '_-')

# 2. Start authorization
curl "https://api.lanonasis.com/oauth/authorize?client_id=cli_app&response_type=code&code_challenge=$CODE_CHALLENGE&code_challenge_method=S256&redirect_uri=http://localhost:8080/callback"

# 3. Exchange code for token
curl -X POST "https://api.lanonasis.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&code_verifier=$CODE_VERIFIER&client_id=cli_app&redirect_uri=http://localhost:8080/callback"
```

### Test User Sync Pipeline

```bash
WEBHOOK_SECRET="d45932caace861750bed85b45ee56c391c967919d9a12df049d6df4aaa248bc1"

# 1. Trigger sync from Main DB
curl -X POST "https://mxtsdgkwzjzlttpotole.supabase.co/functions/v1/batch-sync-users" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET"

# Expected response:
# {"success":true,"hop":"Main DB → Auth-Gateway","stats":{"mainDbUsers":16,"syncedToAuthGateway":16,...}}

# 2. Verify in Neon (via edge function debug)
curl -X POST "https://ptnrwrgzrsbocgxlpvhd.supabase.co/functions/v1/receive-user-sync" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d '{"debug": true}'

# Expected response:
# {"debug":{"db_host":"ep-snowy-surf-...","user_accounts_count":"29",...}}
```

### Test Database Health

```sql
-- Main DB health
SELECT NOW() as main_db_time, COUNT(*) as user_count FROM auth.users;

-- Auth-Gateway health
SELECT NOW() as auth_gw_time,
  (SELECT COUNT(*) FROM auth_gateway.oauth_clients) as oauth_clients,
  (SELECT COUNT(*) FROM auth_gateway.events) as events;

-- Neon health (via edge function)
-- Use debug endpoint above
```

---

## 7. Platform Ecosystem Context

### Planned Multi-Platform Architecture (platform-ecosystem.json)

The original vision defines 5 platforms with unified backend services:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ONASIS PLATFORM ECOSYSTEM                            │
└─────────────────────────────────────────────────────────────────────────┘

  Platform            Domain                   Purpose              Billing
  ────────            ──────                   ───────              ───────
  Seftec SaaS         saas.seftec.tech         Enterprise SaaS      Subscription
  SeftecHub           seftechub.com            Developer Hub        Usage-based
  VortexCore          vortexcore.app           AI/ML Platform       Token consumption
  LanOnasis           lanonasis.com            Privacy Platform     Freemium
  MaaS                maas.onasis.io           Model Hosting        Compute hours
```

### Planned Unified Services

| Service | Provider | Endpoints |
|---------|----------|-----------|
| **Authentication** | Supabase Auth | `/auth/login`, `/auth/register`, `/auth/refresh` |
| **Billing** | Stripe | `/billing/subscribe`, `/billing/usage`, `/billing/portal` |
| **Analytics** | Custom | `/analytics/track`, `/analytics/dashboard` |

### Planned API Routing Pattern

```
Base: /{platform}/api/{service}

Examples:
  https://saas.seftec.tech/api/ai-chat
  https://seftechub.com/api/gateway
  https://vortexcore.app/api/embeddings
  https://lanonasis.com/api/translate
  https://maas.onasis.io/api/inference
```

### Planned Shared Infrastructure

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Supabase      │     │      Redis       │     │   Monitoring     │
│    (Primary)     │     │    (Caching)     │     │    (Custom)      │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ • users          │     │ • sessions       │     │ • response times │
│ • organizations  │     │ • api cache      │     │ • error rates    │
│ • subscriptions  │     │ • rate limiting  │     │ • usage patterns │
│ • usage_logs     │     │ • usage counters │     │ • revenue        │
│ • api_keys       │     │                  │     │                  │
│ • billing_records│     │                  │     │                  │
│ • platform_sessions                       │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 8. Original Plan vs Current State

### What Was Planned (unified-router.js)

1. **Single unified router** for all services
2. **Privacy protection** via PII stripping and vendor masking
3. **Service discovery** endpoint at `/services`
4. **All routes through `/api/{service_name}`**
5. **Vendor-agnostic responses** (replace "openai" with "onasis")

### Current Reality

1. **Distributed architecture** with three databases
2. **Auth-Gateway as Express server** (not unified router pattern)
3. **OAuth PKCE for CLI/IDE** instead of simple token auth
4. **Edge functions for sync** between databases
5. **CQRS/Event Sourcing** for audit trail

### What Needs Alignment

| Area | Original Plan | Current State | Action Needed |
|------|---------------|---------------|---------------|
| Routing | Single `/api/{service}` | Direct endpoints | Consider unifying |
| Privacy | PII stripping middleware | Not implemented | Add to middleware |
| Vendor Masking | Replace model names | Not implemented | Add to responses |
| Service Discovery | `/services` endpoint | Not available | Add endpoint |
| Rate Limiting | Per-service limits | Basic rate limit | Enhance |
| Multi-platform routing | `/{platform}/api/{service}` | Direct endpoints | Implement router |
| Billing integration | Stripe unified | Not connected | Integrate Stripe |
| Analytics | Cross-platform tracking | Not implemented | Build analytics |
| Redis caching | Session/rate limiting | Not implemented | Add Redis |

### Platform Implementation Status

| Platform | Domain | Auth Status | API Status | Notes |
|----------|--------|-------------|------------|-------|
| LanOnasis | lanonasis.com | SSO Working | Partial | Current focus |
| Seftec SaaS | saas.seftec.tech | Not connected | Not started | Needs integration |
| SeftecHub | seftechub.com | Not connected | Not started | Needs integration |
| VortexCore | vortexcore.app | Not connected | Not started | Needs integration |
| MaaS | maas.onasis.io | Not connected | Not started | Needs integration |

### Key File References

| Original Plan | Current Implementation |
|---------------|------------------------|
| `scripts/unified-router.js` | `services/auth-gateway/index.ts` |
| Service routes config | `routes/*.ts` |
| Privacy middleware | `middleware/auth.ts` (partial) |
| Health check | `/health` endpoint exists |

---

## Environment Variables Reference

### Main DB (mxtsdgkwzjzlttpotole)
```env
SUPABASE_URL=https://mxtsdgkwzjzlttpotole.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WEBHOOK_SECRET=d45932caace861750bed85b45ee56c391c967919d9a12df049d6df4aaa248bc1
```

### Auth-Gateway (ptnrwrgzrsbocgxlpvhd)
```env
SUPABASE_URL=https://ptnrwrgzrsbocgxlpvhd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgres://neondb_owner:...@ep-snowy-surf-adqqsawd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NEON_DATABASE_URL=<same as DATABASE_URL>
WEBHOOK_SECRET=d45932caace861750bed85b45ee56c391c967919d9a12df049d6df4aaa248bc1
MAIN_SUPABASE_URL=https://mxtsdgkwzjzlttpotole.supabase.co
MAIN_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

**Document Generated**: 2026-01-17T19:30:00Z
**Next Review**: As architecture changes
