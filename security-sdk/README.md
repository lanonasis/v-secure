# @lanonasis/security-sdk

Centralized Security and Encryption SDK for the Lanonasis/Onasis Ecosystem.

## Purpose

This SDK provides a unified, secure encryption layer used across all Onasis services:

- **MCP Router** - Encrypt user credentials for third-party services
- **API Gateway** - Secure API key storage and validation
- **IDE Extensions** - Secure token storage
- **SDK/CLI** - Credential management
- **Dashboard** - Sensitive data encryption

## Features

- ✅ **AES-256-GCM Encryption** - Industry-standard authenticated encryption
- ✅ **Key Derivation** - HKDF and PBKDF2 support
- ✅ **Key Rotation** - Seamless credential rotation
- ✅ **Secure Hashing** - Password and token hashing
- ✅ **API Key Generation** - Secure random key generation
- ✅ **Data Sanitization** - Safe logging of sensitive data

## Installation

```bash
# In monorepo (workspace)
bun add @lanonasis/security-sdk

# External (npm registry)
npm install @lanonasis/security-sdk
```

## Usage

### Basic Encryption/Decryption

```typescript
import { SecuritySDK } from "@lanonasis/security-sdk";

// Initialize with master key
const security = new SecuritySDK(process.env.ONASIS_MASTER_KEY);

// Encrypt user credentials
const encrypted = security.encrypt(
  { stripe_key: "sk_live_abc123" },
  "user_123_stripe" // context for key derivation
);

// Store encrypted.encrypted, encrypted.iv, encrypted.authTag, encrypted.keyId in database

// Later, decrypt
const decrypted = security.decryptJSON(encrypted, "user_123_stripe");
console.log(decrypted.stripe_key); // 'sk_live_abc123'
```

### Singleton Pattern

```typescript
import { getSecuritySDK } from "@lanonasis/security-sdk";

// Get singleton instance
const security = getSecuritySDK();

const encrypted = security.encrypt("sensitive-data", "context");
```

### Key Rotation

```typescript
// Rotate credentials (generates new key)
const newEncrypted = security.rotate(oldEncrypted, "user_123_stripe");
```

### Hashing & Validation

```typescript
// Hash password
const hashed = security.hash("user-password");

// Verify password
const isValid = security.verifyHash("user-password", hashed); // true
```

### API Key Generation

```typescript
// Generate API key
const apiKey = security.generateAPIKey("onasis"); // 'onasis_abc123...'

// Generate random token
const token = security.generateToken(32); // 64 hex characters
```

### Data Sanitization

```typescript
// Sanitize for logging
const sanitized = security.sanitize("sk_live_abc123def456"); // 'sk_l...f456'
```

## Environment Variables

```bash
# Required: 32-byte (64 hex characters) master key
ONASIS_MASTER_KEY=your_64_character_hex_key

# Alternative name (for backward compatibility)
VSECURE_MASTER_KEY=your_64_character_hex_key
```

### Generate Master Key

```typescript
import { SecuritySDK } from "@lanonasis/security-sdk";

// Generate a new master key (do this once, store securely)
const masterKey = SecuritySDK.generateMasterKey();
console.log(masterKey); // 64 hex characters
```

## API Reference

### `SecuritySDK`

#### Constructor

```typescript
new SecuritySDK(masterKeyHex?: string)
```

#### Methods

**Encryption**

- `encrypt(data, context, options?)` - Encrypt data
- `decrypt(encryptedData, context)` - Decrypt data
- `decryptJSON<T>(encryptedData, context)` - Decrypt and parse JSON
- `rotate(oldEncrypted, context, newData?)` - Rotate encryption

**Hashing**

- `hash(data, salt?)` - Create secure hash
- `verifyHash(data, hashedData)` - Verify hash
- `generateToken(bytes?)` - Generate random token
- `generateAPIKey(prefix?)` - Generate API key

**Utilities**

- `sanitize(data, showChars?)` - Sanitize for logging
- `isValidEncryptedData(data)` - Validate encrypted data structure

**Static**

- `SecuritySDK.generateMasterKey()` - Generate new master key

## Security Best Practices

1. **Master Key Storage**
   - Store master key in secure environment variables
   - Never commit master key to version control
   - Rotate master key periodically
   - Use different keys for dev/staging/production

2. **Context Usage**
   - Use unique context per user/service combination
   - Example: `user_${userId}_${serviceKey}`
   - This ensures key isolation

3. **Key Rotation**
   - Rotate credentials regularly
   - Use the `rotate()` method for seamless rotation
   - Keep old encrypted data until rotation complete

4. **Logging**
   - Always use `sanitize()` before logging sensitive data
   - Never log decrypted credentials
   - Use structured logging with sanitized fields

## Integration Examples

### MCP Router

```typescript
import { getSecuritySDK } from "@lanonasis/security-sdk";

const security = getSecuritySDK();

// Encrypt user's Stripe key
const encrypted = security.encrypt(
  { secret_key: userStripeKey },
  `user_${userId}_stripe`
);

// Store in database
await db.insert("user_mcp_services", {
  user_id: userId,
  service_key: "stripe",
  encrypted_credentials: JSON.stringify(encrypted),
});

// Later, decrypt for use
const encryptedData = JSON.parse(row.encrypted_credentials);
const credentials = security.decryptJSON(
  encryptedData,
  `user_${userId}_stripe`
);
```

### Key Manager Service

```typescript
import { getSecuritySDK } from "@lanonasis/security-sdk";

const security = getSecuritySDK();

// Store vendor API key
const encrypted = security.encrypt(apiKey, `vendor_${vendorName}`);

// Retrieve and decrypt
const decrypted = security.decrypt(encrypted, `vendor_${vendorName}`);
```

## Migration from Old Encryption

If you have existing encrypted data using the old key-manager encryption:

```typescript
// Old format (from key-manager/server.js)
const oldEncrypted = {
  encrypted: "...",
  iv: "...",
  authTag: "...",
};

// Decrypt with old method, re-encrypt with new SDK
const security = new SecuritySDK();
// ... decrypt old data ...
const newEncrypted = security.encrypt(decryptedData, context);
```

## Testing

```bash
bun test
```

## License

MIT

## Support

For issues or questions, contact the Onasis security team.
