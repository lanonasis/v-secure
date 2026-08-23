/**
 * Owns versioned rule evaluation, score aggregation, and review posture.
 * Policy configuration and scoring behaviour are intentionally deferred to RG-004.
 */
export const scoringEngineBoundary = 'scoring-engine' as const;
