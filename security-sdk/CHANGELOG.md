# Changelog

All notable changes to the @onasis/security-sdk will be documented in this file.

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