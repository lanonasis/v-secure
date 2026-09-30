# RiskGPT security boundary

RiskGPT operates as a bounded domain within `lanonasis/v-secure`.

- Its persistence belongs to the private PostgreSQL `risk` schema.
- Risk calculations receive authorization through `RiskAuthorizationGateway`.
- Calculations must not import secret values, secret stores, or secret-management
  services.
- Browser-facing application code does not receive database credentials.
- RLS policy design and append-only audit enforcement are RG-006 deliverables.
