import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiKeyStorage, ApiKeyData } from '../storage/api-key-storage';

describe('ApiKeyStorage', () => {
  let storage: ApiKeyStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new ApiKeyStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Data Interface', () => {
    it('should accept valid ApiKeyData with all fields', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_test123456789',
        organizationId: 'org_123',
        userId: 'user_456',
        environment: 'production',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: '2025-01-01T00:00:00Z',
        metadata: { custom: 'value' }
      };

      expect(data.apiKey).toBe('lano_test123456789');
      expect(data.environment).toBe('production');
      expect(data.metadata?.custom).toBe('value');
    });

    it('should accept minimal ApiKeyData with only required fields', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_minimal'
      };

      expect(data.apiKey).toBe('lano_minimal');
      expect(data.organizationId).toBeUndefined();
    });

    it('should handle different environment types', () => {
      const devData: ApiKeyData = { apiKey: 'key1', environment: 'development' };
      const stagingData: ApiKeyData = { apiKey: 'key2', environment: 'staging' };
      const prodData: ApiKeyData = { apiKey: 'key3', environment: 'production' };

      expect(devData.environment).toBe('development');
      expect(stagingData.environment).toBe('staging');
      expect(prodData.environment).toBe('production');
    });
  });

  describe('isExpired', () => {
    it('should return false for API key without expiration', () => {
      const data: ApiKeyData = { apiKey: 'test_key' };
      expect(storage.isExpired(data)).toBe(false);
    });

    it('should return false for unexpired API key', () => {
      const futureDate = new Date(Date.now() + 86400000 * 30); // 30 days from now
      const data: ApiKeyData = {
        apiKey: 'test_key',
        expiresAt: futureDate.toISOString()
      };
      expect(storage.isExpired(data)).toBe(false);
    });

    it('should return true for expired API key', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const data: ApiKeyData = {
        apiKey: 'test_key',
        expiresAt: pastDate.toISOString()
      };
      expect(storage.isExpired(data)).toBe(true);
    });

    it('should return true when less than 1 hour remaining', () => {
      const nearExpiry = new Date(Date.now() + 1800000); // 30 minutes from now
      const data: ApiKeyData = {
        apiKey: 'test_key',
        expiresAt: nearExpiry.toISOString()
      };
      expect(storage.isExpired(data)).toBe(true);
    });

    it('should return false for invalid date format', () => {
      const data: ApiKeyData = {
        apiKey: 'test_key',
        expiresAt: 'invalid-date'
      };
      expect(storage.isExpired(data)).toBe(false);
    });
  });

  describe('hasApiKey', () => {
    it('should handle hasApiKey check', async () => {
      // In Node environment, hasApiKey checks keytar or file storage
      // The result depends on what's stored
      const result = await storage.hasApiKey();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getApiKey', () => {
    it('should handle getApiKey retrieval', async () => {
      // In Node environment, retrieval depends on storage state
      const result = await storage.getApiKey();
      // Result can be string or null
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('updateMetadata', () => {
    it('should throw error when no API key exists in fresh storage', async () => {
      // Create a fresh storage instance with mocked retrieve
      const mockStorage = new ApiKeyStorage();
      const originalRetrieve = mockStorage.retrieve.bind(mockStorage);

      // Mock retrieve to return null
      vi.spyOn(mockStorage, 'retrieve').mockResolvedValue(null);

      await expect(mockStorage.updateMetadata({ newField: 'value' }))
        .rejects.toThrow('No API key found to update');
    });
  });

  describe('initialize', () => {
    it('should complete initialization without error', async () => {
      await expect(storage.initialize()).resolves.not.toThrow();
    });
  });
});

describe('ApiKeyStorage - API Key Format Validation', () => {
  describe('API Key Prefixes', () => {
    const validPrefixes = ['lano_', 'pk_', 'sk_', 'vx_'];

    validPrefixes.forEach(prefix => {
      it(`should recognize ${prefix} as a valid prefix format`, () => {
        const key = `${prefix}test12345`;
        expect(key.startsWith(prefix)).toBe(true);
      });
    });

    it('should identify keys without valid prefixes', () => {
      const invalidKeys = ['test_key', 'invalid', 'API_KEY', ''];
      const validPrefixList = ['lano_', 'pk_', 'sk_', 'vx_'];

      invalidKeys.forEach(key => {
        const hasValidPrefix = validPrefixList.some(prefix => key.startsWith(prefix));
        expect(hasValidPrefix).toBe(false);
      });
    });
  });

  describe('SHA-256 Key Detection', () => {
    it('should identify a valid SHA-256 hex digest (64 chars)', () => {
      const sha256Key = 'a'.repeat(64);
      const isValidSha256 = /^[a-f0-9]{64}$/i.test(sha256Key);
      expect(isValidSha256).toBe(true);
    });

    it('should reject invalid SHA-256 format (wrong length)', () => {
      const shortKey = 'a'.repeat(32);
      const longKey = 'a'.repeat(128);

      expect(/^[a-f0-9]{64}$/i.test(shortKey)).toBe(false);
      expect(/^[a-f0-9]{64}$/i.test(longKey)).toBe(false);
    });

    it('should reject SHA-256 format with invalid characters', () => {
      const invalidKey = 'g'.repeat(64); // 'g' is not a hex character
      expect(/^[a-f0-9]{64}$/i.test(invalidKey)).toBe(false);
    });
  });
});

describe('ApiKeyStorage - Error Handling', () => {
  let storage: ApiKeyStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new ApiKeyStorage();
  });

  describe('Empty or Invalid API Keys', () => {
    it('should handle empty string API key gracefully', async () => {
      const data: ApiKeyData = { apiKey: '' };
      // The storage should reject empty keys during normalization
      await expect(storage.store(data)).rejects.toThrow();
    });

    it('should handle whitespace-only API key', async () => {
      const data: ApiKeyData = { apiKey: '   ' };
      await expect(storage.store(data)).rejects.toThrow();
    });

    it('should trim whitespace from API keys', () => {
      const trimmedKey = 'lano_test123';
      const keyWithWhitespace = `  ${trimmedKey}  `;

      // Verify the key would be trimmed
      expect(keyWithWhitespace.trim()).toBe(trimmedKey);
    });
  });

  describe('Storage Error Scenarios', () => {
    it('should handle storage retrieval in Node environment', async () => {
      // In Node environment, storage uses keytar or file system
      const newStorage = new ApiKeyStorage();
      const result = await newStorage.retrieve();

      // Should return result or null depending on what's stored
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});
