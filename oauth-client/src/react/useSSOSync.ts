/**
 * React hook to sync Supabase auth state with lanonasis cookies
 * @module @lanonasis/oauth-client/react
 */

import { useCallback, useEffect, useRef } from 'react';
import { isBrowser } from './cookie-utils-browser';
import { DEFAULT_AUTH_GATEWAY, DEFAULT_PROJECT_SCOPE } from '../cookies/constants';
import type { SSOSyncConfig, SupabaseSession, UseSSOSyncReturn } from './types';

/**
 * React hook to sync Supabase auth state with lanonasis cookies
 *
 * Call this hook in components that use Supabase auth to ensure
 * cross-subdomain SSO cookies are set when user logs in.
 *
 * @example
 * ```tsx
 * function AuthProvider({ children }) {
 *   const { data: { session } } = useSupabaseSession();
 *
 *   // Sync Supabase session with SSO cookies
 *   useSSOSync(session, {
 *     projectScope: 'my-app',
 *     onSyncComplete: (success) => {
 *       console.log('SSO sync:', success ? 'success' : 'failed');
 *     }
 *   });
 *
 *   return <>{children}</>;
 * }
 * ```
 */
export function useSSOSync(
  supabaseSession: SupabaseSession | null,
  config: SSOSyncConfig = {}
): UseSSOSyncReturn {
  const {
    authGatewayUrl = DEFAULT_AUTH_GATEWAY,
    projectScope = DEFAULT_PROJECT_SCOPE,
    onSyncComplete,
  } = config;

  // Track the last synced token to avoid duplicate syncs
  const lastSyncedTokenRef = useRef<string | null>(null);

  /**
   * Sync Supabase session with auth gateway to set cross-domain cookies
   */
  const syncWithGateway = useCallback(
    async (session: SupabaseSession): Promise<boolean> => {
      if (!isBrowser()) return false;

      try {
        const response = await fetch(
          `${authGatewayUrl}/v1/auth/token/exchange`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'X-Project-Scope': projectScope,
            },
            credentials: 'include', // Important: include cookies
            body: JSON.stringify({
              project_scope: projectScope,
              platform: 'web',
            }),
          }
        );

        if (!response.ok) {
          console.warn('[oauth-client] SSO sync failed:', response.status);
          onSyncComplete?.(false);
          return false;
        }

        // The response will set cookies via Set-Cookie headers
        const data = await response.json();

        if (data.cookies_set) {
          console.log('[oauth-client] SSO cookies set successfully');
        }

        onSyncComplete?.(true);
        return true;
      } catch (error) {
        console.error('[oauth-client] SSO sync error:', error);
        onSyncComplete?.(false);
        return false;
      }
    },
    [authGatewayUrl, projectScope, onSyncComplete]
  );

  /**
   * Manual sync trigger
   */
  const sync = useCallback(async () => {
    if (!supabaseSession?.access_token) {
      console.warn('[oauth-client] Cannot sync: no Supabase session');
      return false;
    }
    return syncWithGateway(supabaseSession);
  }, [supabaseSession, syncWithGateway]);

  // Auto-sync when session changes
  useEffect(() => {
    const token = supabaseSession?.access_token;

    // Skip if no session or already synced this token
    if (!token || token === lastSyncedTokenRef.current) {
      return;
    }

    // Sync and track the token
    lastSyncedTokenRef.current = token;
    syncWithGateway(supabaseSession);
  }, [supabaseSession?.access_token, syncWithGateway, supabaseSession]);

  return {
    sync,
    syncWithGateway,
  };
}
