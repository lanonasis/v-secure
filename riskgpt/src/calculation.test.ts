import { describe, expect, it } from 'vitest';
import { calculateDeterministicRisk } from './calculation.js';

const authorizedGateway = {
  canAssess: async () => true,
};

const context = {
  actorId: 'analyst-1',
  organizationId: 'org-1',
  roles: ['risk_analyst'],
};

describe('calculateDeterministicRisk', () => {
  it('uses the authorization interface without secret-management dependencies', async () => {
    await expect(
      calculateDeterministicRisk(authorizedGateway, context, {
        assessmentCaseId: 'case-1',
        metricValues: { leverage: 0.4, liquidity: 0.2 },
      }),
    ).resolves.toBeCloseTo(0.3);
  });

  it('does not calculate for an unauthorized actor', async () => {
    await expect(
      calculateDeterministicRisk({ canAssess: async () => false }, context, {
        assessmentCaseId: 'case-1',
        metricValues: { leverage: 0.4 },
      }),
    ).rejects.toThrow('not authorized');
  });
});
