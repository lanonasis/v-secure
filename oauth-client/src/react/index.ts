/**
 * React bindings for @lanonasis/oauth-client
 * @module @lanonasis/oauth-client/react
 *
 * @example
 * ```tsx
 * import { useSSO, useSSOSync } from '@lanonasis/oauth-client/react';
 *
 * function App() {
 *   const { isAuthenticated, user, logout } = useSSO();
 *
 *   if (!isAuthenticated) {
 *     return <a href="https://auth.lanonasis.com/web/login">Login</a>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user?.email}</p>
 *       <button onClick={() => logout()}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */

// Hooks
export { useSSO } from './useSSO';
export { useSSOSync } from './useSSOSync';

// Browser utilities (re-exported for convenience)
export {
  parseUserCookie,
  hasSessionCookie,
  hasAuthCookies,
  clearUserCookie,
  isBrowser,
} from './cookie-utils-browser';

// Types
export type {
  SSOUser,
  SSOState,
  SSOConfig,
  SSOSyncConfig,
  SupabaseSession,
  UseSSOReturn,
  UseSSOSyncReturn,
} from './types';

// Constants (re-exported for convenience)
export {
  COOKIE_NAMES,
  DEFAULT_AUTH_GATEWAY,
  DEFAULT_COOKIE_DOMAIN,
  DEFAULT_POLL_INTERVAL,
  DEFAULT_PROJECT_SCOPE,
} from '../cookies/constants';
