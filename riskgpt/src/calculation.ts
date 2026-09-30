import type { RiskAuthorizationContext, RiskAuthorizationGateway } from './security-auth.js';

export interface RiskCalculationInput {
  assessmentCaseId: string;
  metricValues: Readonly<Record<string, number>>;
}

/**
 * Deliberately receives authorization through an interface. It has no secret
 * store, secret value, API-key, or encryption dependency.
 */
export async function calculateDeterministicRisk(
  authorization: RiskAuthorizationGateway,
  context: RiskAuthorizationContext,
  input: RiskCalculationInput,
): Promise<number> {
  if (!(await authorization.canAssess(context, input.assessmentCaseId))) {
    throw new Error('Risk assessment is not authorized for this actor.');
  }

  const values = Object.values(input.metricValues);
  if (values.length === 0) {
    throw new Error('At least one deterministic metric is required.');
  }
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Risk metrics must be finite non-negative numbers.');
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
