/**
 * Owns audit-event contracts and persistence integration.
 * Append-only controls and event semantics are intentionally deferred to RG-006.
 */
export const auditEventsBoundary = 'audit-events' as const;
