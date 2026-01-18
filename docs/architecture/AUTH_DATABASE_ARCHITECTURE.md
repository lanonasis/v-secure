# Authentication Database Architecture

## Overview

The Lan Onasis authentication system uses a **multi-database architecture** with three separate databases serving distinct purposes. This document describes the data flow, sync mechanisms, and cookie persistence strategy.

## Database Roles

### 1. Main DB (Supabase) - Source of Truth
- **Project**: `mxtsdgkwzjzlttpotole.supabase.co`
- **Purpose**: User authentication (signIn, signUp, password resets)
- **Key Tables**: `auth.users`, `auth.identities`
- **Data**: User credentials, OAuth identities, raw metadata
- **MCP Tool**: `mcp__supabase__*`

This is where:
- Users register and sign in
- OAuth providers (Google, GitHub) create identities
- Credentials are securely stored
- Session tokens originate

### 2. Auth-Gateway DB (Supabase) - Edge Functions Host
- **Project**: `ptnrwrgzrsbocgxlpvhd.supabase.co`
- **Purpose**: Hosts edge functions and OAuth infrastructure
- **Key Tables**: `auth_gateway.oauth_clients`, `auth_gateway.oauth_tokens`, `auth_gateway.oauth_authorization_codes`
- **Note**: `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
- **MCP Tool**: `mcp__supabase2__*`

This is where:
- Edge functions are deployed
- OAuth client registrations live
- OAuth authorization codes and tokens are managed
- Admin override accounts exist

### 3. Neon DB - User Metadata Storage
- **Host**: `ep-snowy-surf-adqqsawd-pooler.c-2.us-east-1.aws.neon.tech`
- **Database**: `neondb`
- **Purpose**: User metadata sync destination, historical storage
- **Key Tables**: `auth_gateway.user_accounts`, `auth_gateway.sessions`

This is where:
- Synced user metadata is stored
- Session data lives
- API keys are validated against
- The `receive-user-sync` edge function writes to

## Sync Pipeline

```
Main DB (mxtsd...)          Auth-Gateway (ptnr...)            Neon
┌─────────────────┐         ┌─────────────────────┐         ┌──────────────────┐
│   auth.users    │ ──────> │  batch-sync-users   │ ──────> │  user_accounts   │
│  (16 users)     │   HTTP  │   (edge function)   │  HTTP   │  (synced data)   │
└─────────────────┘         └─────────────────────┘         └──────────────────┘
                                     │
                                     │ DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
                                     ▼
                            ┌─────────────────────┐
                            │  receive-user-sync  │
                            │   (edge function)   │
                            │  writes to Neon DB  │
                            └─────────────────────┘
```

### Sync Flow

1. **Main DB → Auth-Gateway** (HTTP call)
   - `batch-sync-users` edge function on Main DB
   - Reads from `auth.users`
   - Transforms user data (id, email, role, provider, metadata)
   - Posts to `receive-user-sync` on Auth-Gateway

2. **Auth-Gateway → Neon** (Direct Postgres)
   - `receive-user-sync` edge function on Auth-Gateway
   - Uses `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
   - Writes to `auth_gateway.user_accounts` in Neon

3. **Scheduled Sync** (pg_cron)
   - Main DB: Runs every 6 hours at minute 0
   - Auth-Gateway: Runs every 6 hours at minute 15
   - Uses webhook secret authentication

## Edge Functions

### On Main DB (mxtsdgkwzjzlttpotole)

| Function | verify_jwt | Purpose |
|----------|------------|---------|
| `batch-sync-users` | false | Sync users to Auth-Gateway |

### On Auth-Gateway DB (ptnrwrgzrsbocgxlpvhd)

| Function | verify_jwt | Purpose |
|----------|------------|---------|
| `receive-user-sync` | false | Receive users, write to Neon |
| `batch-sync-to-neon` | false | Sync from local to Neon |

**Important**: All sync functions use `verify_jwt: false` with webhook secret authentication via `X-Webhook-Secret` header.

## Cookie Architecture

### Cookie Names
```typescript
const COOKIE_NAMES = {
  SESSION: 'lanonasis_session',  // HttpOnly JWT session token
  USER: 'lanonasis_user',        // Readable user metadata (JSON)
};
```

### Cookie Flow

1. **Login via Main DB**
   - User authenticates with Main DB (Supabase Auth)
   - Session JWT is created
   - Cookies are set on the response

2. **Cross-Subdomain SSO**
   - Cookies set with domain `.lanonasis.com`
   - All subdomains can read cookies
   - No additional implementation needed on Auth-Gateway

3. **Session Validation**
   - `lanonasis_session` cookie contains JWT
   - JWT verified using shared secret
   - User metadata extracted from `lanonasis_user` cookie

### Cookie Persistence Question

**Q: Do I need to implement cookies on Auth-Gateway too?**

**A: No.** The cookie persistence is handled by the Main DB authentication. Here's why:

1. **Cookies are set at login time** - When users log in via Main DB's Supabase Auth, the cookies are set
2. **Auth-Gateway reads existing cookies** - The middleware in `auth-gateway/middleware/auth.ts` already checks for `lanonasis_session` cookie
3. **Cross-subdomain sharing** - Cookies are set with the right domain scope for all apps to read

What Auth-Gateway does:
- Validates the JWT in `lanonasis_session` cookie
- Falls back to Bearer token and API key authentication
- Provides session management in Neon DB

## Key Files Reference

### Database Clients
- `apps/onasis-core/services/auth-gateway/db/client.ts`
  - `supabaseGateway` - Auth-Gateway Supabase client (for OAuth tables)
  - `supabaseUsers` - Main DB client (for user authentication)
  - `dbPool` - PostgreSQL pool (connects via DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>

### Cookie Utilities
- `packages/shared-auth/src/server/cookie-utils-server.ts`
  - `getSSOUserFromRequest()` - Parse user from request
  - `getSessionTokenFromRequest()` - Get JWT token
  - `hasSSOfromRequest()` - Check if SSO cookies exist

### Auth Middleware
- `apps/onasis-core/services/auth-gateway/middleware/auth.ts`
  - `requireAuth()` - Validates SSO cookie, JWT, or API key
  - `checkSSOCookie()` - Verifies lanonasis_session JWT
  - `requireScopes()` - Scope-based authorization

## Environment Variables

### Main DB Edge Functions
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
WEBHOOK_SECRET=REDACTED_WEBHOOK_SECRET
```

### Auth-Gateway Edge Functions
```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
WEBHOOK_SECRET=REDACTED_WEBHOOK_SECRET
NEON_DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
```

## Current User Counts

| Database | Table | Count | Notes |
|----------|-------|-------|-------|
| Main DB | auth.users | 16 | 10 email, 5 google, 1 other |
| Auth-Gateway | auth_gateway.user_accounts | 0 | Not used (legacy schema) |
| Neon | auth_gateway.user_accounts | 29 | Includes legacy + synced |

## Troubleshooting

### MCP Tool Connection
- `mcp__supabase__*` → Main DB (mxtsd...)
- `mcp__supabase2__*` → Auth-Gateway DB (ptnr...)
- Neither MCP tool connects to Neon directly

### Sync Issues
1. Check webhook secret matches on both ends
2. Verify `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
3. Check pg_cron job status with `SELECT * FROM cron.job`

### Data Mismatch
- Neon may have legacy data from before sync was set up
- Use `TRUNCATE auth_gateway.user_accounts CASCADE` on Neon to reset
- Re-trigger sync from Main DB

---

Last Updated: 2026-01-17
