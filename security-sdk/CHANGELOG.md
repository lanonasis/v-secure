# Changelog

All notable changes to the @lanonasis/security-sdk will be documented in this file.

## [1.0.3] - 2025-11-30

### Added
- **Hash Utilities Module**: New `hash-utils` subpath export for API key hashing
  - `hashApiKey()` - Synchronous SHA-256 hashing (Node.js)
  - `hashApiKeyBrowser()` - Asynchronous SHA-256 hashing (Browser/Web Crypto)
  - `ensureApiKeyHash()` - Normalize API keys to hashes (sync)
  - `ensureApiKeyHashBrowser()` - Normalize API keys to hashes (async)
  - `verifyApiKey()` - Constant-time API key verification
  - `generateApiKey()` - Generate secure API keys with `lns_` prefix
  - `isSha256Hash()` - Validate SHA-256 hash format
- Comprehensive test suite for hash utilities
- Updated package.json exports field for subpath imports

### Changed
- Build process now includes hash-utils as separate entry point
- Package version bumped to 1.0.3

### Usage
```typescript
import { hashApiKey, verifyApiKey } from "@lanonasis/security-sdk/hash-utils";
```

## [1.0.0] - 2025-11-21

### Added
- Initial release of SecuritySDK
- AES-256-GCM encryption with context-based key derivation
- HKDF and PBKDF2 key derivation methods with configurable parameters
- Secure hashing and verification using PBKDF2
- API key and token generation utilities
- Data sanitization for safe logging
- Key rotation capabilities
- Comprehensive type definitions
- Singleton pattern for easy use

### Security
- Context-based key isolation ensuring different contexts get unique derived keys
- Proper random IV generation for each encryption operation
- Authenticated encryption with integrity verification
- Secure key derivation with appropriate parameters