/**
 * The only security/authentication surface that RiskGPT may consume.
 * Implementations belong to the platform integration layer, not a calculator.
 */
export interface RiskAuthorizationContext {
  actorId: string;
  organizationId: string;
  roles: readonly string[];
}

export interface RiskAuthorizationGateway {
  canAssess(
    context: RiskAuthorizationContext,
    assessmentCaseId: string,
  ): Promise<boolean>;
}
