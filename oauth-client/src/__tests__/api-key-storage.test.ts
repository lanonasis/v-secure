import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiKeyStorage, ApiKeyData } from '../storage/api-key-storage';

describe('ApiKeyStorage', () => {
  let storage: ApiKeyStorage;

  beforeEach(() => {
    storage = new ApiKeyStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isExpired', () => {
    it('should return false when expiresAt is not set', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_test_key'
      };

      expect(storage.isExpired(data)).toBe(false);
    });

    it('should return false for non-expired key', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const data: ApiKeyData = {
        apiKey: 'lano_test_key',
        expiresAt: futureDate.toISOString()
      };

      expect(storage.isExpired(data)).toBe(false);
    });

    it('should return true for expired key', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const data: ApiKeyData = {
        apiKey: 'lano_test_key',
        expiresAt: pastDate.toISOString()
      };

      expect(storage.isExpired(data)).toBe(true);
    });

    it('should return true when less than 1 hour remaining (buffer)', () => {
      const almostExpired = new Date(Date.now() + 1800000); // 30 minutes from now
      const data: ApiKeyData = {
        apiKey: 'lano_test_key',
        expiresAt: almostExpired.toISOString()
      };

      expect(storage.isExpired(data)).toBe(true);
    });

    it('should return false when more than 1 hour remaining', () => {
      const safeExpiry = new Date(Date.now() + 7200000); // 2 hours from now
      const data: ApiKeyData = {
        apiKey: 'lano_test_key',
        expiresAt: safeExpiry.toISOString()
      };

      expect(storage.isExpired(data)).toBe(false);
    });

    it('should return false for invalid date format', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_test_key',
        expiresAt: 'invalid-date'
      };

      expect(storage.isExpired(data)).toBe(false);
    });
  });

  describe('ApiKeyData interface', () => {
    it('should accept minimal data with only apiKey', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_minimal_key'
      };

      expect(data.apiKey).toBe('lano_minimal_key');
      expect(data.organizationId).toBeUndefined();
    });

    it('should accept full data with all optional fields', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_full_key',
        organizationId: 'org_123',
        userId: 'user_456',
        environment: 'production',
        createdAt: '2025-01-01T00:00:00Z',
        expiresAt: '2026-01-01T00:00:00Z',
        metadata: {
          name: 'Production API Key',
          permissions: ['read', 'write']
        }
      };

      expect(data.apiKey).toBe('lano_full_key');
      expect(data.organizationId).toBe('org_123');
      expect(data.userId).toBe('user_456');
      expect(data.environment).toBe('production');
      expect(data.metadata?.name).toBe('Production API Key');
    });

    it('should accept valid environment values', () => {
      const environments: Array<'development' | 'staging' | 'production'> = [
        'development',
        'staging',
        'production'
      ];

      for (const env of environments) {
        const data: ApiKeyData = {
          apiKey: 'lano_test',
          environment: env
        };
        expect(data.environment).toBe(env);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metadata object', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_test',
        metadata: {}
      };

      expect(data.metadata).toEqual({});
    });

    it('should handle nested metadata', () => {
      const data: ApiKeyData = {
        apiKey: 'lano_test',
        metadata: {
          nested: {
            deep: {
              value: 'test'
            }
          }
        }
      };

      expect((data.metadata?.nested as any)?.deep?.value).toBe('test');
    });
  });
});
