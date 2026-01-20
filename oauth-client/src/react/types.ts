/**
 * React-specific types for SSO authentication
 * @module @lanonasis/oauth-client/react
 */

/**
 * SSO User information from the lanonasis_user cookie
 */
export interface SSOUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  avatar_url?: string;
}

/**
 * SSO authentication state
 */
export interface SSOState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the auth state is being determined */
  isLoading: boolean;
  /** User information if authenticated */
  user: SSOUser | null;
  /** Error message if auth check failed */
  error: string | null;
}

/**
 * Configuration for the SSO hook
 */
export interface SSOConfig {
  /** Auth gateway URL (default: https://auth.lanonasis.com) */
  authGatewayUrl?: string;
  /** Cookie domain (default: .lanonasis.com) */
  cookieDomain?: string;
  /** Callback when auth state changes */
  onAuthChange?: (state: SSOState) => void;
  /** Polling interval in ms for cookie changes (default: 30000) */
  pollInterval?: number;
}

/**
 * Configuration for Supabase-to-cookie sync
 */
export interface SSOSyncConfig {
  /** Auth gateway URL (default: https://auth.lanonasis.com) */
  authGatewayUrl?: string;
  /** Project scope for multi-tenant auth */
  projectScope?: string;
  /** Callback when sync completes */
  onSyncComplete?: (success: boolean) => void;
}

/**
 * Supabase session interface (minimal for what we need)
 */
export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
}

/**
 * Return type for useSSO hook
 */
export interface UseSSOReturn extends SSOState {
  /** Manually refresh auth state */
  refresh: () => void;
  /** Logout and redirect to auth gateway */
  logout: (returnTo?: string) => void;
  /** Get login URL with optional return URL */
  getLoginUrl: (returnTo?: string) => string;
}

/**
 * Return type for useSSOSync hook
 */
export interface UseSSOSyncReturn {
  /** Manually trigger sync */
  sync: () => Promise<boolean>;
  /** Sync with gateway directly */
  syncWithGateway: (session: SupabaseSession) => Promise<boolean>;
}
