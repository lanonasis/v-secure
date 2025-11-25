# Onasis Security Architecture

## Overview

The Onasis security infrastructure consists of multiple layers working together to provide comprehensive security across all services.

## Security Components

### 1. @onasis/security-sdk (NEW - Centralized Encryption)

**Location:** `packages/security-sdk/`  
**Purpose:** Centralized encryption/decryption SDK used by ALL services  
**Published:** Yes (like memory-sdk, oauth-client)

**Provides:**

- AES-256-GCM encryption
- Key derivation (HKDF/PBKDF2)
- Secure hashing
- API key generation
- Data sanitization

**Used By:**

- MCP Router
- API Gateway
- Key Manager Service
- IDE Extensions
- CLI/SDK
- Dashboard

**Example:**

```typescript
import { getSecuritySDK } from "@onasis/security-sdk";

const security = getSecuritySDK();
const encrypted = security.encrypt(credentials, "user_123_stripe");
```

---

### 2. Key Manager Service

**Location:** `services/key-manager/`  
**Purpose:** REST API for managing vendor API keys  
**Type:** Backend microservice

**Responsibilities:**

- Store/retrieve vendor keys (OpenAI, Anthropic, etc.)
- Key rotation workflows
- Admin access control
- Audit logging

**Should Use:** `@onasis/security-sdk` for encryption (currently has deprecated crypto)

**Endpoints:**

- `GET /v1/keys/vendors` - List keys
- `POST /v1/keys/vendors` - Add key
- `PUT /v1/keys/vendors/:id` - Update key
- `POST /v1/keys/vendors/:id/rotate` - Rotate key

---

### 3. MCP Router Service (NEW)

**Location:** `services/mcp-router/`  
**Purpose:** Zapier-like routing for MCP services  
**Type:** Backend microservice

**Responsibilities:**

- Route MCP calls to third-party services
- Manage user service configurations
- Validate API key scopes
- Track usage and costs

**Uses:** `@onasis/security-sdk` for credential encryption

**Endpoints:**

- `POST /api/v1/mcp/:service/:action` - Route MCP call
- `GET /api/v1/mcp/services` - List services
- `POST /api/v1/mcp/services/:key/configure` - Configure service

---

### 4. API Gateway

**Location:** `services/api-gateway/`  
**Purpose:** Main API gateway with routing and auth  
**Type:** Backend microservice

**Responsibilities:**

- Request routing
- Authentication/authorization
- Rate limiting
- CORS handling

**Should Use:** `@onasis/security-sdk` for any encryption needs

---

### 5. Database Schemas

#### vsecure Schema (Supabase)

**Purpose:** Secure storage for all key-related data

**Tables:**

- `lanonasis_api_keys` - Keys issued TO customers (vx_xxx)
- `external_api_keys` - Keys FROM vendors used BY platform
- `mcp_service_catalog` - Available MCP services
- `user_mcp_services` - User service configurations
- `api_key_scopes` - Key access control
- `mcp_usage_logs` - Usage analytics

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                       │
│  (Dashboard, CLI, IDE Extensions, Mobile Apps, etc.)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     API GATEWAY                              │
│  - Authentication                                            │
│  - Rate Limiting                                             │
│  - Request Routing                                           │
└────────┬────────────────────┬────────────────────┬──────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────────┐
│  MCP ROUTER    │  │  KEY MANAGER   │  │  OTHER SERVICES    │
│  Service       │  │  Service       │  │  (MaaS, Auth, etc.)│
└────────┬───────┘  └────────┬───────┘  └────────────────────┘
         │                   │
         │                   │
         └───────┬───────────┘
                 │
                 ▼
         ┌───────────────────┐
         │ @onasis/security- │
         │      sdk          │ ← CENTRALIZED ENCRYPTION
         │  (Published NPM)  │
         └───────────────────┘
                 │
                 ▼
         ┌───────────────────┐
         │   SUPABASE DB     │
         │  (vsecure schema) │
         └───────────────────┘
```

## Data Flow Example: MCP Router Call

```
1. User Request
   POST /api/v1/mcp/stripe/create-charge
   Authorization: Bearer vx_key_abc123

2. API Gateway
   ├─ Validate token
   ├─ Check rate limit
   └─ Route to MCP Router

3. MCP Router Service
   ├─ Validate API key (query lanonasis_api_keys)
   ├─ Check scope (query api_key_scopes)
   ├─ Get user service (query user_mcp_services)
   │
   ├─ Use @onasis/security-sdk
   │  └─ Decrypt user's Stripe key
   │
   ├─ Spawn MCP server with decrypted key
   ├─ Forward request
   ├─ Get response
   │
   ├─ Use @onasis/security-sdk
   │  └─ Sanitize for logging
   │
   └─ Log usage (insert mcp_usage_logs)

4. Return Response to User
```

## Security SDK vs Services

### @onasis/security-sdk (Package)

- **Type:** NPM package (like memory-sdk)
- **Purpose:** Reusable encryption library
- **Published:** Yes, can be used externally
- **Contains:** Pure encryption/crypto functions
- **No dependencies on:** Supabase, Express, etc.
- **Used by:** All services that need encryption

### Key Manager Service (Microservice)

- **Type:** Backend service (Express server)
- **Purpose:** REST API for key management
- **Published:** No, internal service
- **Contains:** Business logic, API endpoints, database operations
- **Dependencies:** Express, Supabase, @onasis/security-sdk
- **Uses:** @onasis/security-sdk for encryption

### MCP Router Service (Microservice)

- **Type:** Backend service (Express server)
- **Purpose:** MCP routing and credential management
- **Published:** No, internal service
- **Contains:** Routing logic, process management, API endpoints
- **Dependencies:** Express, Supabase, @onasis/security-sdk
- **Uses:** @onasis/security-sdk for encryption

## Comparison with Existing SDKs

| SDK                       | Purpose           | Published | Used By               |
| ------------------------- | ----------------- | --------- | --------------------- |
| `@lanonasis/memory-sdk`   | Memory operations | ✅ Yes    | Apps, CLI, Extensions |
| `@lanonasis/oauth-client` | OAuth flows       | ✅ Yes    | Apps, CLI, Extensions |
| `@onasis/privacy-sdk`     | Data masking      | ✅ Yes    | Apps, Services        |
| `@onasis/security-sdk`    | Encryption        | ✅ Yes    | **ALL services**      |

## Migration Plan for Existing Services

### 1. Key Manager Service

**Current:** Uses deprecated `crypto.createCipher`  
**Should:** Use `@onasis/security-sdk`

```javascript
// OLD (services/key-manager/server.js)
const encrypt = (text) => {
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY); // DEPRECATED
  // ...
};

// NEW (using security-sdk)
import { getSecuritySDK } from "@onasis/security-sdk";
const security = getSecuritySDK();
const encrypted = security.encrypt(text, `vendor_${vendorName}`);
```

### 2. OAuth Client

**Current:** Has custom encryption for token storage  
**Should:** Use `@onasis/security-sdk`

```typescript
// OLD (packages/oauth-client/src/storage/token-storage.ts)
private async encrypt(text: string): Promise<string> {
  // Custom implementation
}

// NEW (using security-sdk)
import { getSecuritySDK } from '@onasis/security-sdk';
const security = getSecuritySDK();
const encrypted = security.encrypt(tokens, `oauth_${userId}`);
```

### 3. MCP Router

**Current:** Was about to create duplicate logic  
**Now:** Uses `@onasis/security-sdk` ✅

## What's in the Security Services Folder?

Based on what we've seen, the security infrastructure includes:

1. **Key Manager Service** (`services/key-manager/`)
   - Vendor API key storage
   - Key rotation
   - Admin management

2. **API Gateway** (`services/api-gateway/`)
   - Request authentication
   - Rate limiting
   - Security headers (helmet)

3. **MCP Router** (`services/mcp-router/`) - NEW
   - MCP service routing
   - Credential management
   - Usage tracking

4. **Database Migrations** (`supabase/migrations/`)
   - 005: API key management tables
   - 008: vsecure schema creation
   - 009: LanOnasis internal keys
   - 010: External vendor keys
   - 012-016: MCP router tables

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PUBLISHED SDKs                          │
│  (Can be used by external developers)                   │
├─────────────────────────────────────────────────────────┤
│  @onasis/security-sdk    ← Encryption (NEW)             │
│  @lanonasis/memory-sdk   ← Memory operations            │
│  @lanonasis/oauth-client ← OAuth flows                  │
│  @onasis/privacy-sdk     ← Data masking                 │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ (used by)
                         │
┌─────────────────────────────────────────────────────────┐
│                  INTERNAL SERVICES                       │
│  (Backend microservices, not published)                 │
├─────────────────────────────────────────────────────────┤
│  services/api-gateway/    ← Main gateway                │
│  services/key-manager/    ← Key management API          │
│  services/mcp-router/     ← MCP routing (NEW)           │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │
                         │
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                              │
│  (Supabase with vsecure schema)                         │
├─────────────────────────────────────────────────────────┤
│  vsecure.lanonasis_api_keys                             │
│  vsecure.external_api_keys                              │
│  vsecure.mcp_service_catalog                            │
│  vsecure.user_mcp_services                              │
│  vsecure.api_key_scopes                                 │
│  vsecure.mcp_usage_logs                                 │
└─────────────────────────────────────────────────────────┘
```

## Summary

**Yes, `@onasis/security-sdk` is exactly like memory-sdk:**

- ✅ Published NPM package
- ✅ Reusable across all services
- ✅ Can be used externally by developers
- ✅ Single source of truth for encryption
- ✅ No business logic, just crypto utilities

**The security services folder contains:**

- Multiple microservices (key-manager, mcp-router, api-gateway)
- Each service uses the centralized SDK
- Each service has specific business logic
- All share the same encryption foundation

**Next step:** Update key-manager service to use the new SDK and continue building MCP router!
