# ADR-003: MAAS/V-Secure Boundary Contract & the "90% Readiness" Gate for V-Secure Full Handshake

Status: Proposed | Date: 2026-06-14

> **Mirrored copy — v-secure.** The source of truth lives in the `lan-onasis-monorepo` at
> `.devops/context-engineering/architecture/adr-003-maas-vsecure-boundary-and-scope-gate.md`,
> and is also mirrored to `apps/onasis-core/services/auth-gateway/docs/architecture/ADR-003-MAAS-VSECURE-BOUNDARY-AND-SCOPE-GATE.md`.
>
> If you edit this document, update all three copies. In case of drift, the
> `.devops/context-engineering/architecture/` copy in the monorepo wins.

---

## Why this document exists

This repo has drifted on the MAAS/V-Secure boundary before — implementations have duplicated across submodules, naming has diverged (`memory:*` vs `memories:*`, dot vs colon scopes), and "two API key systems" were briefly (and incorrectly) flagged as confusion when they are in fact intentional compartmentalization.

This ADR exists to:

1. **Enshrine the MAAS/V-Secure contract** as a durable principle, not a finding to be re-litigated.
2. **Record the layered identity → scope → custody model** so the role of UAI, `auth.ts`, and the vault are unambiguous.
3. **Document the concrete enforcement gaps found during "today's test"** (scoped key vs. master key, scoped key vs. different-service key) as tracked, falsifiable items — not vague TODOs.
4. **Define "90% context separation + scopes"** as a concrete, checkable readiness gate that must be met before the V-Secure Full Handshake work begins.
5. Align with and extend `docs/plans/memory-context-separation-AUDIT.md` (the "AUDIT") — this ADR does not duplicate the AUDIT's inventory, it adds the boundary contract and the enforcement-gap findings on top of it.

---

## Context

The platform is built from two intentionally separate services plus a convergence layer:

- **MAAS** (`apps/lanonasis-maas`, and the memory/intelligence Edge Functions in `apps/onasis-core`): memory, context, CQ scores, recall, user knowledge, SDK/CLI/API access.
- **V-SECURE** (`apps/v-secure`): secrets, credential vaulting, proxy tokens, disposable delegation, revocation, secret-use audit trails.
- **auth-gateway** (`apps/onasis-core/services/auth-gateway`): the router. It does not generate API keys and does not implement vault crypto — it stores hashed keys, resolves identity (UAI), and enforces scopes.

These three are deployed and versioned independently, but share databases and a key-validation path. Drift between them has previously been the source of duplicated implementations and inconsistent enforcement. The AUDIT (`docs/plans/memory-context-separation-AUDIT.md`, dated 2026-03-22) catalogued much of this drift at the data-model level (scope notation, key prefixes, missing columns, duplicate generators). This ADR catalogues it at the **enforcement** level and ties both together into a single go/no-go gate.

---

## Decision 1: The MAAS/V-Secure Contract (verbatim, durable)

This is the canonical statement of the boundary. It supersedes any prior framing (including earlier "two API key universes = confusion" framing from this session, which was **incorrect** — the separation below is intentional and must be preserved).

```
V-SECURE and MAAS are intentionally separate.

MAAS handles memory, context, CQ scores, recall, user knowledge, SDK/CLI/API access.
V-SECURE handles secrets, credential vaulting, proxy tokens, disposable delegation,
revocation, and secret-use audit trails.

MAAS must not store third-party secrets.
V-SECURE must not ingest memory/context content.

Shared access happens only through scoped broker calls.
A MAAS key can request a delegated V-SECURE token only when policy allows it.
A V-SECURE token is not a MAAS API key.

Identity key       ≠   Delegation token
Platform access    ≠   Secret handoff
Memory service     ≠   Vault service
Long-lived auth    ≠   Short-lived capability
```

### What this means concretely

| Concept | MAAS side | V-SECURE side |
|---|---|---|
| What it stores | memory entries, embeddings, CQ scores, recall metadata | third-party credentials, OAuth tokens, certs, SSH keys, webhook secrets |
| Canonical table(s) | `maas.memory_entries`, `security_service.memory_entries` (two schemas — see AUDIT, **open question**) | `security_service.stored_api_keys`, `vsecure.lanonasis_api_keys`, `secrets` |
| Key type issued | platform identity key (`lano_*`, SHA-256 hashed) | delegation token / proxy token (short-lived, scoped) |
| Encryption | none needed — hash-only (identity, not custody) | AES-256-GCM via `EncryptionUtils` (custody) |
| Lifetime | long-lived (until rotated/revoked) | short-lived, disposable, auditable per use |

The **dashboard's two API key sections** ("Lano API keys" = MAAS/memory keys, and the separate V-SECURE section) are the correct UI expression of this split. The naming nomenclature ("Lano API keys" should probably read "Memory API Keys" or similar) needs cleanup, but the *separation itself* is correct and must not be collapsed.

### Naming nomenclature follow-up (non-blocking)
- [ ] Rename dashboard "Lano API keys" section label to make clear these are MAAS/memory keys (cosmetic — does not block the readiness gate below).

---

## Decision 2: The Layered Model — Identity, Scope, Custody

Three distinct layers exist today. Confusing them is the root of most drift. Every future change should be checked against "which layer does this belong to?"

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — IDENTITY (UAI / uai-router.middleware.ts)               │
│  "Who is making this request?"                                    │
│  Resolves: Cookie/SSO → JWT → API Key → MCP token → (PKCE)        │
│  Output: UAIContext { authId, organizationId, email, authMethod,  │
│           credentialId, fromCache, originalUserId }               │
│  Carries NO scope, permission, or service info — by design.       │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2 — SCOPE (auth.ts: requireAuth/requireScopes/scopeMatches) │
│  "What is this identity allowed to do within MAAS?"               │
│  Output: req.scopes (e.g. ['memories:read', 'mcp:*'])             │
│  Enforced via requireScopes() / requireAllScopes() per route.     │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3 — CUSTODY (V-SECURE vault + delegation)                   │
│  "What secrets can this identity's delegated token touch, and     │
│   for how long?"                                                   │
│  Output: short-lived proxy/delegation token, scoped to specific   │
│  third-party credentials, fully audited per use.                  │
└─────────────────────────────────────────────────────────────────┘
```

**UAI = Universal Authentication Identifier.** Confirmed from the doc comment in `uai-router.middleware.ts`: it is explicitly described as "THE convergence point for all authentication methods." Its job ends at Layer 1. It must **never** be extended to carry scope, permission, or vault-custody data — that would re-merge layers that are deliberately separate.

`auth.ts` (`apps/onasis-core/services/auth-gateway/src/middleware/auth.ts`) is Layer 2, and is the **live, production enforcement path** per the auth-gateway's own `CLAUDE.md` (`src/middleware/` is LIVE; top-level `middleware/` is legacy/dead).

Layer 3 (V-SECURE custody/delegation) is reached only via "scoped broker calls" per the contract — i.e., a MAAS-authenticated identity (Layer 1) with sufficient scope (Layer 2) requests a delegation token from V-SECURE, which V-SECURE issues under its own policy. **This broker call path is not yet formally documented as a single code path** — see Readiness Gate item C3.

---

## Decision 3: Findings from "Today's Test"

**Today's test goal (user-stated):** *"make sure that a scoped key cannot pass for a master key or a different service api-key."*

This is a Layer 2 (scope enforcement) property. Two dimensions were investigated.

### Dimension 1 — Scoped key passing as master key

**Mechanism that should prevent this:** `requireScopes()` / `requireAllScopes()` calling `scopeMatches(userScope, requiredScope)` in `auth.ts:310-394`.

**Confirmed gap — the `legacy:full_access` trapdoor:**

- `normalizeScopes()` (`api-key.service.ts:481-524`) defaults a newly created key's scopes to `['legacy:full_access']` **whenever no explicit scopes are provided at creation time**.
- `scopeMatches()` (`auth.ts:310-348`) treats `legacy:full_access` / `legacy.full_access` as matching **any** required scope, unconditionally — i.e., it is a master-key-equivalent wildcard.

**Net effect:** any API key created without an explicit `scopes` array is, today, functionally a master key — regardless of its `access_level` (`authenticated`/`team`/`admin`/etc.) or its intended `key_context` (`personal`/`team`/`enterprise`).

**Verification status: ⚠️ NOT YET CONFIRMED AGAINST TODAY'S TEST.**
Whether today's test actually exercised this trapdoor depends on how the test key was created:

- If the test key was created **with explicit scopes** (e.g., `['memories:read']`), and it *still* passed scope checks meant for a different scope/master — that's a `scopeMatches()` logic bug (not yet found; the wildcard/colon/dot logic in `auth.ts:310-348` appeared correct on inspection).
- If the test key was created **without explicit scopes** (the common/default path), it received `legacy:full_access` and **will** pass every `requireScopes()` check — this is the confirmed trapdoor above, and is almost certainly what was observed.

**Action:** before closing this item, confirm which path the test key took. If default/no-scopes, the fix is in `normalizeScopes()` — change the default away from `legacy:full_access` (see Readiness Gate item S1).

### Dimension 2 — Scoped key passing for a different service's key

**Mechanism that should prevent this:** `service_type` (`'all'` | `'specific'`) and `api_key_scopes` rows, written at creation time by `api-key-create/index.ts:175-203` (validated against `user_mcp_services`).

**Confirmed gap:**

- `validateAPIKey()` (`api-key.service.ts:1163-1410`) performs its 4-table lookup (`security_service.api_keys` → `security_service.stored_api_keys` → `vsecure.lanonasis_api_keys` → `public.api_keys`) and returns `{valid, userId, organizationId, projectScope, keyContext, permissions, ...}`.
- **`service_type` and `api_key_scopes` are never read or returned.** A key created with `service_type: 'specific'` and a restricted `service_keys: ['stripe']` list is, at the auth-gateway layer, indistinguishable from a key with `service_type: 'all'`.
- `apps/v-secure/routes/api-keys.ts` and `apps/v-secure/routes/mcp-api-keys.ts` implement a **different** permission model entirely (MCP tool registration: `permissions.keys[]`, `permissions.environments[]`, `maxConcurrentSessions`, etc. — see `MCPToolSchema`). This does not independently enforce `api_key_scopes`, and operates on a different concept (MCP tool/session access, not "which external service this API key may call").

**Net effect:** a key restricted to "specific" external services at creation time is **not currently blocked** from being used against other services, at either the auth-gateway or V-SECURE layer. **This is a confirmed, unremediated gap** — not contingent on how the test key was created.

### Bonus finding — `stored_api_keys` cross-boundary read

`validateAPIKey()`'s lookup table #2 is `security_service.stored_api_keys` — the **V-SECURE vault table** (`encrypted_value` → `key_hash` comparison). This means the MAAS-side identity validator reads directly from a V-SECURE custody table.

- In practice this is close to a no-op: bearer API keys are not the same shape as vaulted third-party credentials, so matches are rare/never.
- Conceptually, this is the auth-gateway reaching across the MAAS/V-SECURE boundary **incidentally**, not via an explicit "scoped broker call."
- Not necessarily a violation if reframed as an explicit broker call — but today it is *implicit*, which is the pattern this ADR is meant to eliminate. See Readiness Gate item C1.

---

## Decision 4: Scope Notation — Why It Matters for Enforcement

The AUDIT documented a **dot vs. colon** scope notation conflict:

| Location | Notation | Examples |
|---|---|---|
| `api-key-create/index.ts` (EF) | DOT | `memories.read`, `mcp.*` |
| `api-key.service.ts` (auth-gateway) | COLON | `memories:read`, `mcp:*` |
| Routing policy draft | COLON, but singular | `memory:read`, `memory:write` |

`auth-gateway`'s `normalizeScopes()` auto-converts dot→colon with a `console.warn`. The EF does **not** convert. Combined with the `memory:*` vs `memories:*` mismatch, this means:

- A scope written by the EF as `memories.read` is silently rewritten to `memories:read` by the time `auth.ts` evaluates it — **as long as it passes through `normalizeScopes()`**. If any code path stores/reads scopes without going through `normalizeScopes()`, dot-notation scopes will silently fail to match colon-notation `VALID_SCOPES`/`scopeMatches()` checks.
- This is a **correctness precondition** for Dimension 1/2 fixes: you cannot reliably tighten `scopeMatches()` or enforce `api_key_scopes` while two notations coexist, because the fix's test cases will pass or fail depending on which generator created the key.

**This ADR adopts the AUDIT's recommendation as a P0 prerequisite**: unify on **COLON** notation, update `api-key-create/index.ts` to emit colon scopes directly, and remove the dot→colon conversion shim once no producer emits dot notation. Also unify `memory:*` → `memories:*` in the routing policy.

---

## Decision 5: The "90% Readiness" Gate for V-Secure Full Handshake

**User's stated target:** *"my aim is if we nail the context separation and scopes 90%, then we are ready for the v-secure full handshake."*

This section turns that into two checklists. "90%" is operationalized as: **all P0/blocking items checked, plus ≥90% of the weighted items in each category checked.** Each item is independently verifiable (file, table, or test).

### Category C — Context Separation

| # | Item | Priority | Status | Verification |
|---|---|---|---|---|
| C1 | Auth-gateway's `validateAPIKey` no longer reads `security_service.stored_api_keys` incidentally. Either remove this lookup table, or make it an explicit, documented "broker call" with its own audit entry. | P0 | ❌ Open | Code review of `api-key.service.ts:1163-1410` |
| C2 | Resolve the `apiKeyService.ts` duplication between `apps/lanonasis-maas/src/services/apiKeyService.ts` and `apps/v-secure/services/apiKeyService.ts` (both implement `stored_api_keys` + `EncryptionUtils` AES-256-GCM/PBKDF2). Decide: one canonical implementation, the other becomes a thin client/delegate. | P0 | ❌ Open | Diff both files; confirm shared `encryptionKey` source (`API_KEY_ENCRYPTION_KEY`/`JWT_SECRET`) |
| C3 | Document the **single** code path for "MAAS key requests delegated V-SECURE token" (the "scoped broker call" from the contract). If it doesn't exist yet, this is the actual "V-Secure Full Handshake" deliverable — the gate is about being *ready to build it cleanly*, not having it already. | P0 | ❌ Open | Search for existing delegation/proxy-token issuance code in `apps/v-secure` (`mcp_proxy_tokens` table exists per migration `006_api_key_management_service.sql`) |
| C4 | Canonical memory schema decided: `security_service.memory_entries` vs `maas.memory_entries` (AUDIT open question). V-SECURE must provably never read/write either. | P1 | ❌ Open | Decision recorded + grep for cross-schema references from `apps/v-secure` |
| C5 | UAI (`UAIContext`) confirmed to carry no scope/permission/vault fields — **currently true, preserve as regression-tested invariant.** | P1 | ✅ Currently true | `uai-router.middleware.ts:43-58` — add a type-level or test-level guard |
| C6 | MAAS must not store third-party secrets — confirm no MAAS code path writes to `stored_api_keys`/`secrets`/`vsecure.*` for *third-party* credentials (as opposed to the vault-duplication issue in C2, which is about *implementation* location, not data flow direction). | P1 | ⚠️ Partially verified | Re-check after C2 resolution |

### Category S — Scope Enforcement

| # | Item | Priority | Status | Verification |
|---|---|---|---|---|
| S1 | `normalizeScopes()` no longer defaults new keys to `legacy:full_access`. Either require explicit scopes at creation, or default to the narrowest context-appropriate scope (`getContextDefaultScope()` already exists: personal→`memories:personal:*`, team→`memories:team:*`, enterprise→`memories:*`). | P0 | ❌ Open | `api-key.service.ts:481-524` |
| S2 | Scope notation unified to colon end-to-end (Decision 4). `api-key-create/index.ts` emits colon scopes; dot→colon shim becomes a deprecation warning with a removal date, not a silent permanent fixture. | P0 | ❌ Open | `api-key-create/index.ts` + `api-key.service.ts:481-524` |
| S3 | `validateAPIKey()` returns `service_type` and the key's `api_key_scopes` (joined), and `auth.ts` enforces it — i.e., Dimension 2 gap closed. A key with `service_type: 'specific', service_keys: ['stripe']` must be rejected (or scoped down) when used against a non-Stripe-routed endpoint. | P0 | ❌ Open | `api-key.service.ts:1163-1410`, `auth.ts` requireAuth |
| S4 | Regression test exists asserting the literal property from today's test: *"a key created with scope X cannot satisfy `requireScopes(Y)` for Y ∉ X, and cannot satisfy any check via `legacy:full_access` unless explicitly granted."* | P0 | ❌ Open | New test in auth-gateway test suite |
| S5 | `_shared/auth.ts` prefix regex (`lano_|lms_|lns_|vibe_|sk_|pk_|master_`) and the 5 known key generators are reconciled — either one canonical generator, or all updated consistently (AUDIT P3, currently ~30%). | P1 | ⚠️ ~30% (per AUDIT) | AUDIT §"Missing Key Generation Paths" |
| S6 | `api_keys` table has `key_context`, `key_category`, `key_prefix` columns (AUDIT P1 remaining work, currently ~70% done overall). | P1 | ⚠️ ~70% (per AUDIT) | Schema check via Supabase MCP `list_tables` |
| S7 | `requireScope()` (deprecated, exact-`project_scope`-match only, `auth.ts:281-302`) has zero remaining call sites, or is explicitly documented as a legacy-only path with a removal plan. | P2 | ❌ Open | grep for `requireScope(` usages |

### Reading the gate

- **P0 items (C1–C3, S1–S4) are blocking** — "90%" does not apply to these; all must be done regardless of overall percentage. They are the items that directly make Dimension 1/2 of today's test pass.
- **P1/P2 items** are where the "≥90%" weighting applies — e.g., S5/S6 are already AUDIT-tracked at 30%/70% and can progress independently.
- The gate is **about enforcement correctness and boundary cleanliness**, not about V-SECURE feature completeness. "Ready for the full handshake" means: *when V-SECURE issues a delegation token to a MAAS-authenticated identity, the identity's scope has already been correctly and exclusively enforced on the MAAS side* — so the handshake isn't compensating for, or inheriting, MAAS-side scope ambiguity.

---

## Open Questions / Verification Needed (non-blocking but tracked)

1. **How was today's test key created?** (explicit scopes vs. default/`legacy:full_access`). Determines whether Dimension 1's trapdoor was the actual mechanism observed, or whether a separate `scopeMatches()` bug exists. → Resolve before marking S1/S4 as the *complete* fix for Dimension 1.
2. **`apiKeyService.ts` duplication** (C2): is `apps/lanonasis-maas/src/services/apiKeyService.ts` and `apps/v-secure/services/apiKeyService.ts` intentional duplication (e.g., MAAS has a thin read-only mirror for display purposes) or organic drift? Needs a diff.
3. **Canonical memory schema** (C4): `security_service.memory_entries` vs `maas.memory_entries` — AUDIT flags this as undecided; this ADR does not resolve it, but C4 cannot be checked until it is.
4. **Broker call path** (C3): does any delegation/proxy-token issuance code already exist beyond the `mcp_proxy_tokens` table schema? If the table exists but no service code populates/consumes it, C3 is "build," not "document."

---

## Alternatives Considered

### Merge UAI and scope resolution into one layer
Rejected. This is precisely the kind of layer-collapse that caused past drift (e.g., scopes leaking into identity tokens). Keeping UAI scope-free makes it cacheable and reusable across MAAS/V-SECURE without re-deriving permissions on every cache hit.

### Treat `legacy:full_access` as permanently acceptable for backward compatibility
Rejected as a *default*. It can remain as an explicit, audited, opt-in scope for genuinely legacy integrations, but must not be the silent fallback for new keys (S1). Removing it entirely is out of scope for this ADR.

### Defer the notation unification (Decision 4) until after scope-enforcement fixes
Rejected. S2 is a precondition for S3/S4 being testable across all key-creation paths — fixing enforcement logic against only one notation risks the fix appearing to work while the EF-created keys (dot notation) remain unverified.

---

## Consequences

### Positive
- A single, durable statement of the MAAS/V-SECURE boundary exists in three locations agents will actually read (`.devops/context-engineering/architecture/`, auth-gateway docs, v-secure docs).
- "Today's test" becomes two tracked, falsifiable gap items (S1/S3) instead of an ambiguous result.
- The "90% readiness" goal is now a checklist, not a feeling — progress is measurable against C1–C6/S1–S7.
- Aligns with and extends the AUDIT's phase-percentage tracking (P1 ~70%, P2 ~90%, P3 ~30%, P5 ~40%) rather than introducing a parallel tracking scheme.

### Negative
- Three copies of this document must be kept in sync manually until/unless a docs-sync mechanism exists (see ADR-002, "some duplicated content will need ongoing reconciliation").
- S1 (changing the default scope behavior) is a behavior change for any existing key created without explicit scopes — needs a migration/communication plan for currently-issued `legacy:full_access` keys (out of scope for this ADR, flagged for the implementation plan).

---

## Status / Next Steps

1. Resolve Open Question 1 (how today's test key was created) to confirm Dimension 1 root cause.
2. Land S2 (notation unification) first — it is the precondition for S1/S3/S4 being verifiable across all key-creation paths.
3. Land S1, S3, S4 (P0 scope-enforcement items).
4. Resolve C1–C3 (P0 context-separation items) — C3 in particular may be the actual scope of the "V-Secure Full Handshake" work itself.
5. Re-evaluate P1/P2 items against AUDIT phase tracking; recompute readiness percentage.
6. Once all P0 items are checked and ≥90% of P1/P2 items are checked: **V-Secure Full Handshake work may begin.**
