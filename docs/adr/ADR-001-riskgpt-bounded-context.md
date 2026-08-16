# ADR-001: RiskGPT bounded context in `lanonasis/v-secure`

- Status: Accepted
- Date: 2026-08-16
- Decision owner: LanOnasis

## Decision

`lanonasis/v-secure` is the canonical implementation repository for the Vortex Security & Risk platform. V-SECURE and VortexRisk/RiskGPT are independently bounded product domains within this repository.

RiskGPT implementation is owned by the `riskgpt/` package and its explicitly named service boundary. RiskGPT consumes authentication and security capabilities through interfaces; it must not import, query, or otherwise depend on V-SECURE secret-management internals when calculating risk.

Repository consolidation does not imply database-schema consolidation. RiskGPT owns the PostgreSQL `risk` schema and the migrations in `supabase/migrations/` that create and evolve it. It does not add RiskGPT tables to V-SECURE's existing schemas.

## Consequences

- Existing V-SECURE packages and their observable behavior remain unchanged.
- `riskgpt/` has its own package manifest, tests, and CI workflow.
- The first owned persistence objects are `risk.assessment_cases`, `risk.business_subjects`, `risk.financial_statements`, `risk.source_documents`, `risk.metrics`, `risk.assessments`, `risk.triggered_rules`, `risk.analyst_reviews`, and `risk.audit_events`.
- Shared authentication and security are injected through interfaces such as `RiskAuthorizationGateway`; secret values, secret-store tables, and secret-management services are outside the RiskGPT calculation boundary.
- A future split or rename is justified only by observed operational or ownership evidence, not anticipated scale alone.

## Delivery guardrails

1. Every RiskGPT database change is a migration owned by this repository.
2. Private `risk` schema tables are not exposed through the Supabase Data API by default.
3. Changes to RiskGPT must pass `npm --prefix riskgpt test`; the repository-wide package suite continues to run the existing V-SECURE tests.
4. Immutable audit behavior is completed as the RG-006 delivery item; this ADR establishes the table and ownership boundary without claiming the later control is already implemented.
