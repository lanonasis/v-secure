# RiskGPT workspace

RiskGPT is a bounded product domain inside `lanonasis/v-secure`. It owns the
private PostgreSQL `risk` schema and consumes platform authorization through
defined interfaces; it does not depend on V-SECURE secret-management internals.

## Package ownership

| Workspace | Owner | Delivery issue |
| --- | --- | --- |
| `apps/analyst-web` | Analyst application composition | RG-005 |
| `packages/financial-schema` | Canonical financial contracts and validation | RG-002 |
| `packages/metrics-engine` | Deterministic metric calculations | RG-003 |
| `packages/scoring-engine` | Versioned rules, score and review posture | RG-004 |
| `packages/audit-events` | Assessment audit contracts and persistence integration | RG-006 |
| `src/` | Shared bounded-context entry points and authorization boundary | RG-000 / RG-001 |

The package markers are intentionally thin. They establish ownership and
independent build boundaries without pre-implementing the later domain work.

## Verification

From `riskgpt/`:

```bash
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run build
```

Every RiskGPT PR must link its RG issue and include the commands/results above
in its PR body. Financial schema, methodology, calculation, scoring, and audit
changes additionally require the relevant fixture or regression evidence.
