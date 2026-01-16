# @lanonasis/privacy-sdk

Enterprise-grade privacy utilities for PII detection, data masking, anonymization, and GDPR compliance.

Part of the **LanOnasis Security Suite** - Powered by **VortexShield**

[![npm version](https://badge.fury.io/js/%40lanonasis%2Fprivacy-sdk.svg)](https://www.npmjs.com/package/@lanonasis/privacy-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Data Masking** - Mask 15+ PII types (email, phone, SSN, cards, IBAN, etc.)
- **PII Detection** - Automatic detection with confidence scoring
- **International Support** - US, UK, EU formats (phone, postal, national IDs)
- **Validation** - Luhn algorithm, checksum validation
- **Classification** - Sensitivity levels and regulation mapping
- **Audit Logging** - Track all privacy operations
- **Universal** - Works in Node.js and browsers
- **Zero Dependencies** - Lightweight and secure

---

## Installation

```bash
npm install @lanonasis/privacy-sdk
# or
bun add @lanonasis/privacy-sdk
```

---

## Quick Start

```typescript
import { PrivacySDK, mask, detect, detectAndMask, scan } from '@lanonasis/privacy-sdk';

// Simple masking
mask('john@example.com', 'email');        // -> 'j**n@example.com'
mask('555-123-4567', 'phone');            // -> '***-***-4567'
mask('4111111111111111', 'credit-card');  // -> '************1111'

// PII detection
const results = detect('Contact john@test.com or call 555-123-4567');
// -> [{ type: 'email', value: 'john@test.com', confidence: 0.99 }, ...]

// Detect and mask in one step
detectAndMask('Email me at secret@company.com');
// -> 'Email me at s****t@company.com'

// Scan objects recursively
const report = scan({ user: { email: 'test@test.com', phone: '555-111-2222' } });
// -> { piiFound: true, results: [...] }
```

---

## API Reference

### Masking

```typescript
import { mask, PrivacySDK } from '@lanonasis/privacy-sdk';

// Basic masking
mask(data: string, type: PIIType, options?: MaskingOptions): string

// Supported types
type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit-card'
  | 'iban'
  | 'ip-address'
  | 'name'
  | 'uk-nino'
  | 'uk-postcode'
  | 'dob'
  | 'passport'
  | 'custom';

// Options
interface MaskingOptions {
  maskChar?: string;      // Default: '*'
  showFirst?: number;     // Characters to show at start
  showLast?: number;      // Characters to show at end
  preserveFormat?: boolean;
  locale?: 'US' | 'UK' | 'EU' | 'DE' | 'FR';
  pattern?: string | RegExp;  // For custom type
}
```

### Examples

```typescript
// Email
mask('john.doe@example.com', 'email');
// -> 'j********e@example.com'

// Phone (international)
mask('+44 7911 123456', 'phone');
// -> '+** **** ***456'

// Credit card with options
mask('4111111111111111', 'credit-card', { showFirst: 4, showLast: 4 });
// -> '4111********1111'

// SSN
mask('123-45-6789', 'ssn');
// -> '***-**-6789'

// IBAN
mask('DE89 3704 0044 0532 0130 00', 'iban');
// -> 'DE** ************3000'

// UK National Insurance Number
mask('AB 12 34 56 C', 'uk-nino');
// -> '**********C'

// IP Address
mask('192.168.1.100', 'ip-address');
// -> '***.***..1.100'

// Custom pattern
mask('SECRET123', 'custom', { pattern: /[A-Z]+/g, maskChar: '#' });
// -> '######123'
```

---

### Detection

```typescript
import { detect, detectAndMask } from '@lanonasis/privacy-sdk';

// Detect PII
const results = detect(text: string, options?: { locale?: Locale });

// Returns
interface DetectionResult {
  type: PIIType;
  value: string;           // Original value
  masked: string;          // Masked version
  position: number;        // Position in text
  length: number;
  confidence: number;      // 0-1 confidence score
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  regulations: string[];   // ['GDPR', 'CCPA', 'PCI-DSS', etc.]
}

// Detect and mask in one step
const sanitized = detectAndMask(text);
```

### Examples

```typescript
const text = 'Contact jane@company.com or call 555-987-6543. SSN: 123-45-6789';

const detected = detect(text);
// -> [
//   { type: 'email', value: 'jane@company.com', confidence: 0.99, sensitivity: 'high' },
//   { type: 'phone', value: '555-987-6543', confidence: 0.95, sensitivity: 'medium' },
//   { type: 'ssn', value: '123-45-6789', confidence: 0.98, sensitivity: 'critical' }
// ]

const sanitized = detectAndMask(text);
// -> 'Contact j***e@company.com or call ***-***-6543. SSN: ***-**-6789'
```

---

### Object Scanning

```typescript
import { scan, sanitize } from '@lanonasis/privacy-sdk';

// Scan objects recursively
const report = scan(obj, options?: ScanOptions);

interface ScanOptions {
  deep?: boolean;              // Scan nested objects (default: true)
  autoMask?: boolean;          // Return sanitized object
  confidenceThreshold?: number; // Min confidence (default: 0.7)
  includeFieldNames?: boolean;  // Use field name hints
}

// Returns
interface ScanResult {
  piiFound: boolean;
  results: Array<{ path: string; type: PIIType; value: string; masked: string }>;
  sanitized?: unknown;  // If autoMask: true
}

// Explicit field sanitization
const sanitized = sanitize(obj, fieldMappings);
```

### Examples

```typescript
// Recursive scan
const user = {
  id: 123,
  contact: {
    email: 'user@test.com',
    phone: '555-111-2222'
  },
  cards: [{ number: '4111111111111111' }]
};

const report = scan(user, { deep: true, autoMask: true });
// report.piiFound = true
// report.results = [
//   { path: 'contact.email', type: 'email', ... },
//   { path: 'contact.phone', type: 'phone', ... },
//   { path: 'cards[0].number', type: 'credit-card', ... }
// ]
// report.sanitized = { ... masked object ... }

// Explicit sanitization
const customer = { email: 'test@test.com', card: '4111111111111111' };
const safe = sanitize(customer, {
  email: 'email',
  card: { type: 'credit-card', showFirst: 4, showLast: 4 }
});
// -> { email: 't**t@test.com', card: '4111********1111' }
```

---

### Classification

```typescript
import { privacy } from '@lanonasis/privacy-sdk';

const result = privacy.classify('4111111111111111');
// -> {
//   type: 'credit-card',
//   sensitivity: 'critical',
//   confidence: 0.98,
//   regulations: ['PCI-DSS', 'GDPR', 'CCPA']
// }
```

---

### Anonymization

```typescript
import { privacy } from '@lanonasis/privacy-sdk';

// Deterministic anonymous ID (same input = same output)
privacy.generateAnonymousId('user123', 'salt');
// -> 'anon_a1b2c3d4e5f6g7h8'

// Random token
privacy.generateToken(16);
// -> 'f4c7e9a2b1d8c3f5...' (32 hex chars)

// One-way hash
privacy.hash('sensitive-data', 'salt');
// -> '8f14e45f...'
```

---

### Custom Patterns

```typescript
import { privacy } from '@lanonasis/privacy-sdk';

// Register custom pattern
privacy.registerPattern({
  type: 'employee-id',
  pattern: /EMP-\d{6}/gi,
  sensitivity: 'medium',
  regulations: ['Internal'],
  validate: (value) => value.startsWith('EMP-'),
});

// Now detects your custom type
privacy.detect('Contact EMP-123456 for help');
// -> [{ type: 'employee-id', value: 'EMP-123456', ... }]
```

---

### Audit Logging

```typescript
import { PrivacySDK } from '@lanonasis/privacy-sdk';

const privacy = new PrivacySDK({ auditLog: true });

privacy.mask('test@test.com', 'email');
privacy.detect('555-123-4567');

const log = privacy.getAuditLog();
// -> [
//   { timestamp, operation: 'mask', dataType: 'email', success: true },
//   { timestamp, operation: 'detect', success: true }
// ]

// Filter by operation
privacy.getAuditLog({ operation: 'mask' });

// Clear log
privacy.clearAuditLog();
```

---

### Configuration

```typescript
import { PrivacySDK } from '@lanonasis/privacy-sdk';

const privacy = new PrivacySDK({
  // Masking
  enableMasking: true,
  defaultMaskChar: '*',
  preserveFormat: true,

  // Detection
  enableAutoDetect: true,
  confidenceThreshold: 0.7,
  detectFieldNames: true,

  // Compliance
  gdprMode: true,
  auditLog: true,

  // Logging
  logLevel: 'basic',
});

// Update config at runtime
privacy.configure({ defaultMaskChar: '#' });
```

---

## Supported PII Types

| Type | Format | Sensitivity | Regulations |
|------|--------|-------------|-------------|
| `email` | Standard email | High | GDPR, CCPA |
| `phone` | US/UK/EU/International | Medium | CCPA |
| `ssn` | XXX-XX-XXXX | Critical | HIPAA, CCPA |
| `credit-card` | Major card formats | Critical | PCI-DSS, GDPR |
| `iban` | EU bank accounts | High | GDPR, PCI-DSS |
| `ip-address` | IPv4, IPv6 | Medium | GDPR |
| `dob` | MM/DD/YYYY, DD/MM/YYYY | High | GDPR, HIPAA |
| `uk-nino` | National Insurance | Critical | GDPR |
| `uk-postcode` | UK postal codes | Medium | GDPR |
| `passport` | US passport numbers | Critical | GDPR |
| `name` | Personal names | Medium | GDPR |

---

## Integration with LanOnasis Suite

```typescript
// Use with @lanonasis/security-sdk for encryption
import { PrivacySDK } from '@lanonasis/privacy-sdk';
import { SecuritySDK } from '@lanonasis/security-sdk';

const privacy = new PrivacySDK();
const security = new SecuritySDK(process.env.MASTER_KEY);

// Mask, then encrypt sensitive data
const masked = privacy.mask(userSSN, 'ssn');
const encrypted = security.encrypt(masked, 'user_context');
```

---

## Related Packages

| Package | Purpose |
|---------|---------|
| [@lanonasis/security-sdk](https://www.npmjs.com/package/@lanonasis/security-sdk) | Encryption, key management |
| [@lanonasis/security-shield](https://www.npmjs.com/package/@lanonasis/security-shield) | Edge bot protection |
| [@lanonasis/mem-intel-sdk](https://www.npmjs.com/package/@lanonasis/mem-intel-sdk) | Memory intelligence |

---

## License

MIT (c) [LanOnasis](https://lanonasis.com)

---

Built with care by the LanOnasis team - [VortexShield](https://vortexshield.lanonasis.com)
