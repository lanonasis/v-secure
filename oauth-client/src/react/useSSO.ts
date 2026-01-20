/**
 * React hook for SSO authentication state
 * @module @lanonasis/oauth-client/react
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseUserCookie, hasSessionCookie, isBrowser } from './cookie-utils-browser';
import { DEFAULT_AUTH_GATEWAY, DEFAULT_POLL_INTERVAL } from '../cookies/constants';
import type { SSOState, SSOConfig, UseSSOReturn } from './types';

/**
 * React hook for SSO authentication state
 *
 * Reads the lanonasis_user cookie to determine auth state.
 * Works across all *.lanonasis.com subdomains.
 *
 * @example
 * ```tsx
 * function Navbar() {
 *   const { isAuthenticated, user, logout } = useSSO();
 *
 *   if (isAuthenticated && user) {
 *     return <span>Welcome, {user.email}</span>;
 *   }
 *   return <a href="https://auth.lanonasis.com/web/login">Sign In</a>;
 * }
 * ```
 */
export function useSSO(config: SSOConfig = {}): UseSSOReturn {
  const {
    authGatewayUrl = DEFAULT_AUTH_GATEWAY,
    onAuthChange,
    pollInterval = DEFAULT_POLL_INTERVAL,
  } = config;

  const [state, setState] = useState<SSOState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Track previous state for change detection
  const prevStateRef = useRef<SSOState | null>(null);

  /**
   * Check current auth state from cookies
   */
  const checkAuthState = useCallback(() => {
    if (!isBrowser()) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
      return;
    }

    try {
      const hasSession = hasSessionCookie();
      const user = parseUserCookie();

      const newState: SSOState = {
        isAuthenticated: hasSession && user !== null,
        isLoading: false,
        user: hasSession ? user : null,
        error: null,
      };

      setState(newState);

      // Notify if auth state changed
      if (
        onAuthChange &&
        prevStateRef.current &&
        prevStateRef.current.isAuthenticated !== newState.isAuthenticated
      ) {
        onAuthChange(newState);
      }

      prevStateRef.current = newState;
    } catch (error) {
      const errorState: SSOState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : 'Failed to check auth state',
      };
      setState(errorState);
      prevStateRef.current = errorState;
    }
  }, [onAuthChange]);

  /**
   * Manually refresh auth state
   */
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    checkAuthState();
  }, [checkAuthState]);

  /**
   * Logout - redirects to auth gateway logout endpoint
   */
  const logout = useCallback((returnTo?: string) => {
    if (!isBrowser()) return;

    const logoutUrl = new URL('/web/logout', authGatewayUrl);
    if (returnTo) {
      logoutUrl.searchParams.set('return_to', returnTo);
    }
    window.location.href = logoutUrl.toString();
  }, [authGatewayUrl]);

  /**
   * Get login URL with optional return URL
   */
  const getLoginUrl = useCallback((returnTo?: string) => {
    const loginUrl = new URL('/web/login', authGatewayUrl);
    if (returnTo) {
      loginUrl.searchParams.set('return_to', returnTo);
    }
    return loginUrl.toString();
  }, [authGatewayUrl]);

  // Initial auth check
  useEffect(() => {
    const timer = setTimeout(checkAuthState, 0);
    return () => clearTimeout(timer);
  }, [checkAuthState]);

  // Poll for cookie changes (cookies don't trigger events)
  useEffect(() => {
    if (!isBrowser() || pollInterval <= 0) return;

    const interval = setInterval(checkAuthState, pollInterval);
    return () => clearInterval(interval);
  }, [checkAuthState, pollInterval]);

  // Listen for storage events (cross-tab communication)
  useEffect(() => {
    if (!isBrowser()) return;

    const handleStorageChange = (event: StorageEvent) => {
      // Re-check auth state when storage changes (in case of logout in another tab)
      if (event.key === null || event.key?.includes('auth')) {
        checkAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuthState]);

  // Listen for focus events (check when user returns to tab)
  useEffect(() => {
    if (!isBrowser()) return;

    const handleFocus = () => {
      checkAuthState();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkAuthState]);

  return {
    ...state,
    refresh,
    logout,
    getLoginUrl,
  };
}
