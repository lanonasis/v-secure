# Changelog

All notable changes to `@lanonasis/oauth-client` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
