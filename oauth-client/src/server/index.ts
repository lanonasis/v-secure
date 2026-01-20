/**
 * Server-side utilities for @lanonasis/oauth-client
 * @module @lanonasis/oauth-client/server
 *
 * @example
 * ```typescript
 * import {
 *   requireAuth,
 *   getSSOUserFromRequest,
 *   COOKIE_NAMES
 * } from '@lanonasis/oauth-client/server';
 *
 * // Use as Express middleware
 * app.use('/api', requireAuth());
 *
 * // Or check manually in a route
 * app.get('/api/me', (req, res) => {
 *   const user = getSSOUserFromRequest(req);
 *   if (!user) {
 *     return res.status(401).json({ error: 'Not authenticated' });
 *   }
 *   res.json({ user });
 * });
 * ```
 */

// Cookie utilities
export {
  COOKIE_NAMES,
  parseCookieHeader,
  getSessionToken,
  parseUserCookieServer,
  hasSessionCookieServer,
  hasAuthCookiesServer,
  getSSOUserFromRequest,
  getSessionTokenFromRequest,
  hasSSOfromRequest,
} from './cookie-utils';

// Express middleware
export {
  validateSessionMiddleware,
  requireAuth,
  optionalAuth,
  requireRole,
} from './middleware';

// Types
export type {
  SSOUser,
  ServerRequest,
  ServerResponse,
  NextFunction,
  CookieOptions,
  MiddlewareConfig,
  AuthValidationResult,
} from './types';

// Constants (re-exported for convenience)
export {
  DEFAULT_AUTH_GATEWAY,
  DEFAULT_COOKIE_DOMAIN,
  DEFAULT_PROJECT_SCOPE,
} from '../cookies/constants';
