/**
 * Browser-side cookie utilities for SSO authentication
 * @module @lanonasis/oauth-client/react
 */

import { COOKIE_NAMES } from '../cookies/constants';
import type { SSOUser } from './types';

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Parse the lanonasis_user cookie (non-HttpOnly, readable by JS)
 * This cookie contains: { id, email, role, name?, avatar_url? }
 *
 * @returns User data or null if cookie doesn't exist or is invalid
 */
export function parseUserCookie(): SSOUser | null {
  if (!isBrowser()) return null;

  try {
    const cookies = document.cookie.split(';');
    const userCookie = cookies.find(c =>
      c.trim().startsWith(`${COOKIE_NAMES.USER}=`)
    );

    if (!userCookie) return null;

    const value = userCookie.split('=').slice(1).join('=').trim();
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as SSOUser;

    // Validate required fields
    if (!parsed.id || !parsed.email || !parsed.role) {
      console.warn('[oauth-client] Invalid user cookie: missing required fields');
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[oauth-client] Failed to parse user cookie:', error);
    return null;
  }
}

/**
 * Check if the session cookie exists (cannot read value due to HttpOnly)
 *
 * @returns true if lanonasis_session cookie exists
 */
export function hasSessionCookie(): boolean {
  if (!isBrowser()) return false;
  return document.cookie.includes(`${COOKIE_NAMES.SESSION}=`);
}

/**
 * Check if user appears to be authenticated based on cookies
 *
 * @returns true if both session and user cookies exist
 */
export function hasAuthCookies(): boolean {
  return hasSessionCookie() && parseUserCookie() !== null;
}

/**
 * Clear auth cookies (client-side only clears non-HttpOnly cookies)
 * Full logout should redirect to auth gateway
 *
 * @param domain - Cookie domain (default: .lanonasis.com)
 */
export function clearUserCookie(domain: string = '.lanonasis.com'): void {
  if (!isBrowser()) return;

  // Clear the user cookie (non-HttpOnly, we can delete it)
  document.cookie = `${COOKIE_NAMES.USER}=; domain=${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
