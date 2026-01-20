/**
 * Server-side cookie utilities for SSO authentication
 * Use these utilities in Express/Node.js server middleware
 *
 * @module @lanonasis/oauth-client/server
 */

import { COOKIE_NAMES } from '../cookies/constants';
import type { SSOUser, ServerRequest } from './types';

// Re-export COOKIE_NAMES for convenience
export { COOKIE_NAMES };

/**
 * Parse cookies from a cookie string (from request headers)
 * @param cookieHeader - The Cookie header value (e.g., "name=value; name2=value2")
 * @returns Object mapping cookie names to values
 */
export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name) {
      cookies[name.trim()] = valueParts.join('=').trim();
    }
  }

  return cookies;
}

/**
 * Get the session token from cookies (request.cookies or cookie header)
 * @param cookies - Parsed cookies object or cookie header string
 * @returns The session token or null
 */
export function getSessionToken(cookies: Record<string, string> | string | undefined): string | null {
  if (!cookies) return null;

  const parsed = typeof cookies === 'string' ? parseCookieHeader(cookies) : cookies;
  const token = parsed[COOKIE_NAMES.SESSION];

  return token || null;
}

/**
 * Parse the user cookie from server-side request
 * @param cookies - Parsed cookies object or cookie header string
 * @returns User data or null if cookie doesn't exist or is invalid
 */
export function parseUserCookieServer(cookies: Record<string, string> | string | undefined): SSOUser | null {
  if (!cookies) return null;

  try {
    const parsed = typeof cookies === 'string' ? parseCookieHeader(cookies) : cookies;
    const userCookie = parsed[COOKIE_NAMES.USER];

    if (!userCookie) return null;

    const decoded = decodeURIComponent(userCookie);
    const user = JSON.parse(decoded) as SSOUser;

    // Validate required fields
    if (!user.id || !user.email || !user.role) {
      console.warn('[oauth-client/server] Invalid user cookie: missing required fields');
      return null;
    }

    return user;
  } catch (error) {
    console.warn('[oauth-client/server] Failed to parse user cookie:', error);
    return null;
  }
}

/**
 * Check if session cookie exists in the cookies
 * @param cookies - Parsed cookies object or cookie header string
 * @returns true if lanonasis_session cookie exists
 */
export function hasSessionCookieServer(cookies: Record<string, string> | string | undefined): boolean {
  if (!cookies) return false;

  const parsed = typeof cookies === 'string' ? parseCookieHeader(cookies) : cookies;
  return COOKIE_NAMES.SESSION in parsed && !!parsed[COOKIE_NAMES.SESSION];
}

/**
 * Check if user appears to be authenticated based on cookies (server-side)
 * @param cookies - Parsed cookies object or cookie header string
 * @returns true if both session and user cookies exist
 */
export function hasAuthCookiesServer(cookies: Record<string, string> | string | undefined): boolean {
  return hasSessionCookieServer(cookies) && parseUserCookieServer(cookies) !== null;
}

/**
 * Get SSO user from Express request (checks req.cookies first, then cookie header)
 * @param req - Express-like request object
 * @returns User data or null
 */
export function getSSOUserFromRequest(req: ServerRequest): SSOUser | null {
  // First try req.cookies (populated by cookie-parser middleware)
  if (req.cookies) {
    return parseUserCookieServer(req.cookies);
  }

  // Fallback to parsing cookie header
  return parseUserCookieServer(req.headers?.cookie);
}

/**
 * Get session token from Express request
 * @param req - Express-like request object
 * @returns Session token or null
 */
export function getSessionTokenFromRequest(req: ServerRequest): string | null {
  // First try req.cookies (populated by cookie-parser middleware)
  if (req.cookies) {
    return getSessionToken(req.cookies);
  }

  // Fallback to parsing cookie header
  return getSessionToken(req.headers?.cookie);
}

/**
 * Check if request has SSO authentication
 * @param req - Express-like request object
 * @returns true if SSO cookies are present
 */
export function hasSSOfromRequest(req: ServerRequest): boolean {
  if (req.cookies) {
    return hasAuthCookiesServer(req.cookies);
  }
  return hasAuthCookiesServer(req.headers?.cookie);
}
