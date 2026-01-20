/**
 * Server-side types for SSO authentication
 * @module @lanonasis/oauth-client/server
 */

import type { SSOUser } from '../react/types';

// Re-export SSOUser for server consumers
export type { SSOUser };

/**
 * Express-like request interface for middleware compatibility
 */
export interface ServerRequest {
  cookies?: Record<string, string>;
  headers?: {
    cookie?: string;
    authorization?: string;
    'x-api-key'?: string;
    [key: string]: string | string[] | undefined;
  };
  user?: SSOUser;
}

/**
 * Express-like response interface
 */
export interface ServerResponse {
  status: (code: number) => ServerResponse;
  json: (data: unknown) => void;
  clearCookie: (name: string, options?: CookieOptions) => void;
}

/**
 * Express-like next function
 */
export type NextFunction = (error?: Error) => void;

/**
 * Cookie options for clearCookie
 */
export interface CookieOptions {
  domain?: string;
  path?: string;
}

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  /** Auth gateway URL for token validation */
  authGatewayUrl?: string;
  /** Project scope for multi-tenant auth */
  projectScope?: string;
  /** Cookie domain (default: .lanonasis.com) */
  cookieDomain?: string;
  /** Allow unauthenticated requests to pass through */
  allowAnonymous?: boolean;
}

/**
 * Validation result for auth checks
 */
export interface AuthValidationResult {
  valid: boolean;
  user?: SSOUser;
  error?: string;
}
