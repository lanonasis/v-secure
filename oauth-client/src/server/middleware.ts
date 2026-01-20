/**
 * Express middleware for SSO authentication
 * @module @lanonasis/oauth-client/server
 */

import { DEFAULT_AUTH_GATEWAY, DEFAULT_COOKIE_DOMAIN, DEFAULT_PROJECT_SCOPE, COOKIE_NAMES } from '../cookies/constants';
import { getSSOUserFromRequest, hasSSOfromRequest } from './cookie-utils';
import type { ServerRequest, ServerResponse, NextFunction, MiddlewareConfig } from './types';

/**
 * Create a middleware that validates SSO session cookies
 *
 * @example
 * ```typescript
 * import { validateSessionMiddleware } from '@lanonasis/oauth-client/server';
 *
 * const auth = validateSessionMiddleware({
 *   authGatewayUrl: process.env.AUTH_GATEWAY_URL,
 *   projectScope: 'my-app'
 * });
 *
 * app.use('/api', auth);
 * ```
 */
export function validateSessionMiddleware(config: MiddlewareConfig = {}) {
  const {
    cookieDomain = DEFAULT_COOKIE_DOMAIN,
    allowAnonymous = false,
  } = config;

  return (req: ServerRequest, res: ServerResponse, next: NextFunction) => {
    // Check for SSO cookies
    if (hasSSOfromRequest(req)) {
      const user = getSSOUserFromRequest(req);
      if (user) {
        // Attach user to request
        req.user = user;
        return next();
      }
    }

    // No valid session
    if (allowAnonymous) {
      return next();
    }

    // Clear any invalid cookies
    res.clearCookie(COOKIE_NAMES.SESSION, { domain: cookieDomain, path: '/' });
    res.clearCookie(COOKIE_NAMES.USER, { domain: cookieDomain, path: '/' });

    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      login_url: `${config.authGatewayUrl || DEFAULT_AUTH_GATEWAY}/web/login`,
    });
  };
}

/**
 * Middleware that requires authentication (returns 401 if not authenticated)
 *
 * @example
 * ```typescript
 * import { requireAuth } from '@lanonasis/oauth-client/server';
 *
 * app.get('/api/profile', requireAuth(), (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export function requireAuth(config: MiddlewareConfig = {}) {
  return validateSessionMiddleware({ ...config, allowAnonymous: false });
}

/**
 * Middleware that allows anonymous access but attaches user if authenticated
 *
 * @example
 * ```typescript
 * import { optionalAuth } from '@lanonasis/oauth-client/server';
 *
 * app.get('/api/public', optionalAuth(), (req, res) => {
 *   if (req.user) {
 *     res.json({ message: `Hello ${req.user.email}` });
 *   } else {
 *     res.json({ message: 'Hello guest' });
 *   }
 * });
 * ```
 */
export function optionalAuth(config: MiddlewareConfig = {}) {
  return validateSessionMiddleware({ ...config, allowAnonymous: true });
}

/**
 * Middleware that requires a specific role
 *
 * @example
 * ```typescript
 * import { requireRole } from '@lanonasis/oauth-client/server';
 *
 * app.delete('/api/users/:id', requireRole('admin'), (req, res) => {
 *   // Only admins can delete users
 * });
 * ```
 */
export function requireRole(role: string | string[], config: MiddlewareConfig = {}) {
  const roles = Array.isArray(role) ? role : [role];

  return (req: ServerRequest, res: ServerResponse, next: NextFunction) => {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        login_url: `${config.authGatewayUrl || DEFAULT_AUTH_GATEWAY}/web/login`,
      });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required_role: roles,
        current_role: req.user.role,
      });
    }

    return next();
  };
}
