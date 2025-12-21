# Vortex API Key Manager – Project Guide

This repo is a hardened extraction of a proof-of-concept secret manager. It includes:

- `@vortex-secure/cli` (`vortex-cli/`): developer CLI for interacting with a Vortex API.
- `@vortex-secure/mcp-sdk` (`packages/vortex-mcp-sdk/`): SDK for MCP tool/agent secret access workflows.
- `supabase-schema.sql`: Supabase/Postgres schema for projects/secrets + MCP-related tables (RLS enabled).

## What’s “MCP SDK” vs “API Key Manager”?

The **API key manager** is the overall product idea (projects + secrets + rotation + access logging).  
The SDK currently included in this repo is specifically the **MCP integration client** (hence `mcp-sdk`). It’s meant for tools/agents that need short-lived secret access and approval workflows, not a full CRUD admin SDK.

If you need a general-purpose “API client SDK” (create/list/rotate secrets, manage projects, etc.), it should be a separate package (e.g. `@vortex-secure/sdk`) to avoid mixing agent-access patterns with admin workflows.

## Repo tour

- `README.md`: quick start and basic usage.
- `DATABASE_SETUP.md`: Supabase setup steps.
- `supabase-schema.sql`: schema + RLS policies (demo seed data removed).
- `vortex-cli/src/index.ts`: CLI implementation.
- `vortex-cli/src/security.ts`: CSPRNG, endpoint validation, allow-list, TLS options.
- `packages/vortex-mcp-sdk/src/index.ts`: MCP client implementation.
- `packages/vortex-mcp-sdk/src/security.ts`: endpoint validation, allow-list, TLS options.

## Build, test, publish

This is an npm workspaces monorepo.

- Install: `npm ci`
- Build all: `npm run build`
- Test all: `npm test`

Publishing notes (important because these packages will be imported into multiple in-house projects):

- `dist/` is **not committed** (see `.gitignore`) and must be built for packaging.
- Both packages run `tsc` in `prepublishOnly`, so `npm publish` builds before publishing.
- Verify tarball contents before publishing:
  - `npm pack -w @vortex-secure/cli --dry-run`
  - `npm pack -w @vortex-secure/mcp-sdk --dry-run`
- Runtime deps are declared in `dependencies` (not `devDependencies`); verify with:
  - `npm ls -w @vortex-secure/cli --omit=dev --depth=0`
  - `npm ls -w @vortex-secure/mcp-sdk --omit=dev --depth=0`

## Network security defaults (CLI + SDK)

Both the CLI and SDK treat endpoint configuration as security-sensitive. By default they:

- Require `https://` endpoints (reject `http://` unless explicitly allowed for local dev).
- Optionally enforce a hostname allow-list.
- Optionally enforce TLS hardening (custom CA and/or SPKI pinning).
- Disable redirects (`maxRedirects: 0`) to avoid https→http downgrade via redirects.

### Endpoint allow-list

**Environment variable**

- `VORTEX_ALLOWED_HOSTS`: comma-separated allowed hosts.

Entries can be:

- `api.example.com` (hostname)
- `api.example.com:443` (host + port)
- `localhost:4056` (local dev)
- `[::1]:4056` (IPv6 + port)

**CLI flags**

- `--allowed-host <host>` (repeatable)
- `--allowed-hosts <host1,host2,...>`

If set, any endpoint host not on the list is rejected before any network calls occur.

### TLS hardening (axios + ws)

TLS options apply **only** to `https://` (and `wss://`) endpoints.

**Environment variables**

- `VORTEX_TLS_CA_FILE`: path to a PEM CA bundle.
- `VORTEX_TLS_CA`: PEM contents (string). Prefer `VORTEX_TLS_CA_FILE` to avoid multiline env pitfalls.
- `VORTEX_TLS_PINNED_SPKI_SHA256`: comma-separated SPKI pins (accepts either `sha256/<pin>` or `<pin>`).

**CLI flags**

- `--tls-ca-file <path>`
- `--tls-pin-spki <sha256/...>` (repeatable)

**SDK config**

```ts
import { VortexMCPClient } from '@vortex-secure/mcp-sdk';

const client = new VortexMCPClient({
  vortexEndpoint: 'https://api.example.com',
  mcpToken: process.env.VORTEX_MCP_TOKEN!,
  toolId: 'my-tool',
  toolName: 'My Tool',
  allowedHosts: ['api.example.com'],
  tls: {
    caFile: '/path/to/ca.pem',
    pinnedSpkiSha256: ['sha256/REPLACE_WITH_BASE64URL_PIN']
  }
});
```

**Pin rotation tip**

To avoid outages when certs/keys rotate, configure **multiple pins** (current + next) during rotation windows.

### Local dev override (not recommended)

- `VORTEX_ALLOW_INSECURE_HTTP=1` or CLI `--allow-insecure-http` allows `http://` endpoints for local dev.
- Keep this disabled in any environment that handles real secrets.

### How to generate an SPKI pin

Using OpenSSL (prints base64url without padding):

```bash
HOST=api.example.com
PORT=443
PIN=$(
  openssl s_client -connect "$HOST:$PORT" -servername "$HOST" < /dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl base64 \
  | tr '+/' '-_' \
  | tr -d '='
)
echo "sha256/$PIN"
```

## Supabase schema & RLS

`supabase-schema.sql`:

- Enables RLS on all tables.
- Uses separate policies per action (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) and adds `WITH CHECK` where needed.
- Removes demo seed data to avoid shipping knowable IDs or placeholder “secrets”.
- Does **not** ship permissive policies for VPS tables by default; add explicit admin-only policies if you use those tables.

## Operational guardrails

- `.gitignore` prevents committing `dist/`, `.env`, and local config files like `.vortex`.
- `.env.example` documents supported env vars for security and configuration.
- `.github/workflows/ci.yml` runs build/tests and `npm audit --omit=dev` on CI.

