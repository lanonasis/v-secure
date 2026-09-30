import { describe, expect, it } from 'vitest';
import { analystApplicationBoundary } from '../apps/analyst-web/src/index.js';
import { auditEventsBoundary } from '../packages/audit-events/src/index.js';
import { financialSchemaBoundary } from '../packages/financial-schema/src/index.js';
import { metricsEngineBoundary } from '../packages/metrics-engine/src/index.js';
import { scoringEngineBoundary } from '../packages/scoring-engine/src/index.js';

describe('RiskGPT workspace boundaries', () => {
  it('keeps the Phase 1 delivery areas independently named and non-overlapping', () => {
    expect([
      analystApplicationBoundary,
      financialSchemaBoundary,
      metricsEngineBoundary,
      scoringEngineBoundary,
      auditEventsBoundary,
    ]).toEqual([
      'analyst-application',
      'financial-schema',
      'metrics-engine',
      'scoring-engine',
      'audit-events',
    ]);
  });
});
