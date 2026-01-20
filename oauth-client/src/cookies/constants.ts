/**
 * Cookie constants and utilities shared between browser and server
 * @module @lanonasis/oauth-client/cookies
 */

/**
 * Cookie names used by Lan Onasis auth system
 */
export const COOKIE_NAMES = {
  /** HttpOnly JWT session token */
  SESSION: 'lanonasis_session',
  /** Readable user metadata (JSON) */
  USER: 'lanonasis_user',
} as const;

/**
 * Default cookie domain for cross-subdomain SSO
 */
export const DEFAULT_COOKIE_DOMAIN = '.lanonasis.com';

/**
 * Default auth gateway URL
 */
export const DEFAULT_AUTH_GATEWAY = 'https://auth.lanonasis.com';

/**
 * Default polling interval for cookie changes (30 seconds)
 */
export const DEFAULT_POLL_INTERVAL = 30000;

/**
 * Default project scope for multi-tenant auth
 */
export const DEFAULT_PROJECT_SCOPE = 'lanonasis-maas';
