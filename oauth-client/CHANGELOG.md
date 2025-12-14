# Changelog

All notable changes to `@lanonasis/oauth-client` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
