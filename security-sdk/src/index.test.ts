import { describe, it, expect } from 'vitest';
import { SecuritySDK, getSecuritySDK } from './index';

describe('SecuritySDK', () => {
  const masterKey = 'a'.repeat(64); // 32 bytes in hex

  it('should initialize correctly', () => {
    const sdk = new SecuritySDK(masterKey);
    expect(sdk).toBeInstanceOf(SecuritySDK);
  });

  it('should encrypt and decrypt data', () => {
    const sdk = new SecuritySDK(masterKey);
    const originalData = 'test-data';
    const context = 'test-context';

    const encrypted = sdk.encrypt(originalData, context);
    const decrypted = sdk.decrypt(encrypted, context);

    expect(decrypted).toBe(originalData);
  });

  it('should encrypt and decrypt JSON data', () => {
    const sdk = new SecuritySDK(masterKey);
    const originalData = { key: 'value', number: 42 };
    const context = 'test-json-context';

    const encrypted = sdk.encrypt(originalData, context);
    const decrypted = sdk.decryptJSON(encrypted, context);

    expect(decrypted).toEqual(originalData);
  });

  it('should generate and verify hash', () => {
    const sdk = new SecuritySDK(masterKey);
    const password = 'test-password';

    const hashed = sdk.hash(password);
    const isValid = sdk.verifyHash(password, hashed);

    expect(isValid).toBe(true);
  });

  it('should generate API key', () => {
    const sdk = new SecuritySDK(masterKey);
    const apiKey = sdk.generateAPIKey('test');

    expect(apiKey).toMatch(/^test_[a-f0-9]{64}$/);
  });

  it('should sanitize sensitive data', () => {
    const sdk = new SecuritySDK(masterKey);
    const sensitive = 'very_long_sensitive_token_value';

    const sanitized = sdk.sanitize(sensitive, 4);

    expect(sanitized).toBe('very...lue');
  });

  it('should work with singleton pattern', () => {
    const sdk1 = getSecuritySDK(masterKey);
    const sdk2 = getSecuritySDK(masterKey);

    expect(sdk1).toBe(sdk2); // Same instance
  });

  it('should generate valid master key', () => {
    const masterKey = SecuritySDK.generateMasterKey();
    
    expect(masterKey).toHaveLength(64); // 32 bytes in hex
    expect(masterKey).toMatch(/^[a-f0-9]{64}$/);
  });
});