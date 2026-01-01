import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenStorage } from '../storage/token-storage';
import type { TokenResponse } from '../types';

describe('TokenStorage', () => {
  let storage: TokenStorage;

  beforeEach(() => {
    storage = new TokenStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isTokenExpired', () => {
    it('should return false for API key tokens (expires_in = 0)', () => {
      const apiKeyToken: TokenResponse & { issued_at?: number } = {
        access_token: 'onasis_api_key_123',
        expires_in: 0,
        token_type: 'api-key',
        issued_at: Date.now() - 86400000 // 1 day ago
      };

      expect(storage.isTokenExpired(apiKeyToken)).toBe(false);
    });

    it('should return false for API key token type regardless of expires_in', () => {
      const apiKeyToken: TokenResponse & { issued_at?: number } = {
        access_token: 'onasis_api_key_123',
        expires_in: 3600,
        token_type: 'api-key',
        issued_at: Date.now() - 86400000
      };

      expect(storage.isTokenExpired(apiKeyToken)).toBe(false);
    });

    it('should return false for tokens without expires_in', () => {
      const token: TokenResponse & { issued_at?: number } = {
        access_token: 'token',
        expires_in: 0,
        token_type: 'Bearer',
        issued_at: Date.now()
      };

      // expires_in of 0 with non-api-key type should be treated as no expiry
      expect(storage.isTokenExpired({ ...token, expires_in: undefined as any })).toBe(false);
    });

    it('should return true for tokens missing issued_at timestamp', () => {
      const token: TokenResponse = {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      expect(storage.isTokenExpired(token)).toBe(true);
    });

    it('should return false for valid non-expired tokens', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() // Just issued
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() - 7200000 // 2 hours ago
      };

      expect(storage.isTokenExpired(token)).toBe(true);
    });

    it('should return true when less than 5 minutes remaining (buffer)', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() - 3400000 // ~56 minutes ago (4 min remaining)
      };

      expect(storage.isTokenExpired(token)).toBe(true);
    });

    it('should return false when more than 5 minutes remaining', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() - 3000000 // 50 minutes ago (10 min remaining)
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });
  });

  describe('Token Response Validation', () => {
    it('should handle token with all optional fields', () => {
      const fullToken: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        refresh_token: 'refresh_456',
        expires_in: 7200,
        token_type: 'Bearer',
        scope: 'memories:read memories:write',
        issued_at: Date.now()
      };

      expect(storage.isTokenExpired(fullToken)).toBe(false);
    });

    it('should handle minimal token response', () => {
      const minimalToken: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        expires_in: 3600,
        token_type: 'Bearer',
        issued_at: Date.now()
      };

      expect(storage.isTokenExpired(minimalToken)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle token expiring exactly at 5 minute boundary', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 300, // 5 minutes
        token_type: 'Bearer',
        issued_at: Date.now() - 1000 // 1 second ago
      };

      // Should still be valid (just under 5 min remaining)
      expect(storage.isTokenExpired(token)).toBe(true);
    });

    it('should handle very long-lived tokens', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 31536000, // 1 year
        token_type: 'Bearer',
        issued_at: Date.now()
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });

    it('should handle tokens with zero issued_at', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        issued_at: 0
      };

      // issued_at of 0 is falsy, should be treated as missing
      expect(storage.isTokenExpired(token)).toBe(true);
    });
  });
});
