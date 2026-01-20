# Changelog

All notable changes to `@lanonasis/oauth-client` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-20

### Added
- **NEW: React Hooks Export (`./react`)**
  - `useSSO()` - React hook for SSO authentication state management
  - `useSSOSync()` - Hook for cross-subdomain session synchronization
  - `parseUserCookie()` - Browser-side cookie parsing utility
  - `hasSessionCookie()` - Check for session cookie presence
  - `hasAuthCookies()` - Validate complete auth cookie state
  - `clearUserCookie()` - Clear authentication cookies
  - `isBrowser()` - Environment detection helper

- **NEW: Server Middleware Export (`./server`)**
  - `requireAuth()` - Express middleware that enforces authentication (401 if not authenticated)
  - `optionalAuth()` - Middleware that attaches user if authenticated but allows anonymous access
  - `requireRole(role)` - Middleware that enforces specific user roles (403 if insufficient permissions)
  - `validateSessionMiddleware()` - Configurable session validation middleware
  - `getSSOUserFromRequest()` - Extract SSO user from Express request
  - `getSessionTokenFromRequest()` - Extract session token from request
  - `hasSSOfromRequest()` - Check if request has valid SSO cookies
  - `parseCookieHeader()` - Parse raw cookie header string
  - Cookie constants: `COOKIE_NAMES`, `DEFAULT_AUTH_GATEWAY`, `DEFAULT_COOKIE_DOMAIN`

- **NEW: Shared Cookie Constants (`./cookies`)**
  - Centralized cookie name definitions for `lanonasis_session` and `lanonasis_user`
  - Default configuration values for auth gateway and cookie domain

### Changed
- **BREAKING**: Major version bump to 2.0.0 for new subpath exports
- Package now consolidates all Lanonasis authentication into one package
- `@lanonasis/shared-auth` is now deprecated and re-exports from this package

### Migration from @lanonasis/shared-auth
```typescript
// BEFORE (deprecated)
import { useSSO } from '@lanonasis/shared-auth';
import { getSSOUserFromRequest } from '@lanonasis/shared-auth/server';

// AFTER (recommended)
import { useSSO } from '@lanonasis/oauth-client/react';
import { getSSOUserFromRequest, requireAuth } from '@lanonasis/oauth-client/server';
```

## [1.2.8] - 2026-01-13

### Added
- **Magic Link Flow**: Passwordless authentication via OTP and magic links
  - `MagicLinkFlow` class for email-based passwordless authentication
  - `sendMagicLink(email)` - Send magic link to user's email
  - `sendOTP(email)` - Send one-time password to email
  - `verifyOTP(email, code)` - Verify OTP code and obtain tokens
  - `verifyMagicLink(token)` - Verify magic link token
  - Configurable OTP length and expiration
  - Integration with auth-gateway `/v1/auth/magic-link/*` and `/v1/auth/otp/*` endpoints

### Fixed
- Bug fix in `apikey-flow.ts`: corrected `this.authBaseUrl` reference

## [1.2.7] - 2026-01-10

### Changed
- Version bump for dependency updates
- Improved auth-gateway compatibility

## [1.2.3] - 2025-12-13

### Fixed
- **Browser Build**: Fixed browser bundle to exclude Node.js-only dependencies (`open`, `eventsource`, `child_process`, etc.)
  - Created separate `mcp-client-browser.ts` that excludes `TerminalOAuthFlow` (which requires Node.js `open` package)
  - Browser build now only includes `DesktopOAuthFlow` for OAuth (browser popups/Electron windows)
  - Resolves "Module not found: Can't resolve 'child_process'" errors in Next.js/React builds
  - Package now works seamlessly in browser environments without bundler errors

## [1.2.2] - 2025-12-07

### Added
- Browser-first bundle and conditional exports (`./browser`) to avoid pulling Node-only deps into web builds
- Web-only token and API key storage implementations backed by Web Crypto + localStorage

### Changed
- Default OAuth scope now matches platform standard: `memories:read memories:write memories:delete profile`
- MCPClient auto-selects browser storage when `window` is available and accepts custom `tokenStorage`
- `fetch` calls now use `cross-fetch` for compatibility on older Node runtimes
- PKCE/state generation relies on Web Crypto/global crypto (no Node `require` paths)

### Fixed
- Node-only modules (`open`, `keytar`, `fs`, `os`, `crypto`) are now behind dynamic imports/externals to keep browser builds working
- Base64 fallbacks use `Buffer` in non-window environments to prevent runtime crashes
- Resolved package.json merge conflict and published clean version metadata

## [1.1.0] - 2025-01-25

### Added
- **API Key Authentication**: New authentication mode supporting direct API key access
  - Added `APIKeyFlow` class for API key authentication flow
  - API keys can be provided via `apiKey` config option
  - Automatic authentication mode detection (OAuth vs API key)
  - API keys never expire (no refresh logic needed)
  - Uses `x-api-key` header for API authenticated requests
- Updated MCPClient to support dual authentication modes
- Enhanced documentation with API key usage examples

### Changed
- Updated `MCPClient.connect()` to handle both OAuth and API key modes
- Updated `MCPClient.request()` to use appropriate auth header based on mode
- Updated `TokenStorage.isTokenExpired()` to treat API keys as never expiring
- Updated WebSocket and SSE connections to use correct auth headers
- Enhanced `ensureAccessToken()` to skip refresh logic for API keys
- Updated package description to reflect dual authentication support

### Fixed
- 401 errors in API key mode now return clear error message instead of retry loop

## [1.0.2] - 2025-01-24

### Fixed
- Removed GitHub Packages registry configuration causing publish failures
- Fixed package.json publishConfig to use public npm registry only

## [1.0.1] - 2025-01-23

### Changed
- Initial stable release
- OAuth2 PKCE flow support for terminal and desktop environments
- Token lifecycle management with automatic refresh
- Secure token storage across multiple platforms

## [1.0.0] - 2025-01-20

### Added
- Initial release
- OAuth flows for terminal and desktop
- Token storage with multiple backend support
- MCP WebSocket/SSE connectivity
- ESM + CJS bundles with TypeScript types
