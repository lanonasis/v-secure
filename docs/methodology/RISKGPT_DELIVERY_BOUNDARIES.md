# RiskGPT delivery boundaries

The deterministic Phase 1 implementation is delivered in dependency order:

1. RG-002 defines validated, human-confirmed financial input contracts.
2. RG-003 implements pure deterministic metrics using those contracts.
3. RG-004 applies versioned scoring configuration to computed metrics.
4. RG-005 composes the analyst workflow and evidence rendering.
5. RG-006 records immutable, reproducible assessment audit traces.

RG-001 creates the workspace seams only. It does not define financial fields,
formulas, scoring thresholds, the analyst assessment flow, or append-only
behaviour.
