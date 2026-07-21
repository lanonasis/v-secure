# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-07-21

### Fixed
- **IBAN detector false positives.** The `iban` pattern matched any 2-letters+2-digits+alnum
  run and had no checksum, so UUIDs, hex hashes, base64 blobs, session ids and model names in
  text were flagged as bank accounts (~11.7k false positives observed on agent transcripts). Added
  ISO 13616 / ISO 7064 **mod-97-10 checksum validation** (mirrors the Luhn check already used by
  the credit-card detector) and made the pattern case-sensitive (dropped the `/i` flag, since
  canonical IBANs are uppercase). Valid IBANs are unaffected; real credential detections
  (api-key, jwt, private-key, etc.) are unchanged.

## [1.0.0] - 2024-01-16

### Added
- Initial release
- **Data Masking** for 15+ PII types:
  - Email, phone, SSN, credit card, IBAN
  - IP address (IPv4/IPv6), UK NINO, UK postcode
  - Name, date of birth, passport
  - Custom patterns with regex support
- **PII Detection** with confidence scoring (0-100%)
- **Validation**: Luhn algorithm for credit cards, SSN validation rules
- **International Support**: US, UK, EU phone formats and national IDs
- **Regulation Mapping**: GDPR, CCPA, PCI-DSS, HIPAA tags per PII type
- **Object Scanning**: Recursive deep scanning with path tracking
- **Field Name Hints**: Auto-detect PII from field names (email, phone_number, etc.)
- **Audit Logging**: Optional operation tracking with filtering
- **Anonymization**: Deterministic IDs, random tokens, one-way hashing
- **Custom Patterns**: Register custom PII patterns with validators
- **Batch Processing**: `maskBatch()` for multiple values
- **Universal Support**: Browser (Web Crypto API) and Node.js
- **Zero Dependencies**: No runtime dependencies

### Security
- Luhn algorithm validation for credit cards
- SSN area code validation
- IP address range validation
- Constant-time operations where applicable
