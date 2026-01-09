import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenStorage } from '../storage/token-storage';
import { TokenResponse } from '../types';

// Mock localStorage for web environment testing
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
};

describe('TokenStorage', () => {
  let storage: TokenStorage;
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = createLocalStorageMock();

    // Setup global mocks
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

    storage = new TokenStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Response Interface', () => {
    it('should accept valid TokenResponse with all fields', () => {
      const token: TokenResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'read write',
        issued_at: Date.now()
      };

      expect(token.access_token).toBeDefined();
      expect(token.token_type).toBe('Bearer');
      expect(token.expires_in).toBe(3600);
    });

    it('should accept minimal TokenResponse', () => {
      const token: TokenResponse = {
        access_token: 'access_123',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      expect(token.access_token).toBe('access_123');
      expect(token.refresh_token).toBeUndefined();
    });

    it('should handle API key token type', () => {
      const token: TokenResponse = {
        access_token: 'lano_api_key_123',
        expires_in: 0, // API keys don't expire
        token_type: 'api-key'
      };

      expect(token.token_type).toBe('api-key');
      expect(token.expires_in).toBe(0);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for API key tokens (token_type = api-key)', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'lano_key_123',
        expires_in: 0,
        token_type: 'api-key',
        issued_at: Date.now() - 86400000 * 365 // 1 year ago
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });

    it('should return false for tokens with expires_in = 0', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        expires_in: 0,
        token_type: 'Bearer',
        issued_at: Date.now()
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });

    it('should return false for tokens without expiry info', () => {
      const token: TokenResponse = {
        access_token: 'access_123',
        expires_in: 0,
        token_type: 'Bearer'
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });

    it('should return true for tokens missing issued_at', () => {
      const token: TokenResponse & { issued_at?: number } = {
        access_token: 'access_123',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      // Should warn and treat as expired
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(storage.isTokenExpired(token)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return false for valid unexpired tokens', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now()
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() - 7200000 // 2 hours ago
      };

      expect(storage.isTokenExpired(token)).toBe(true);
    });

    it('should return true when less than 5 minutes remaining', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() - 3420000 // 57 minutes ago (3 minutes remaining)
      };

      expect(storage.isTokenExpired(token)).toBe(true);
    });

    it('should return false when more than 5 minutes remaining', () => {
      const token: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        issued_at: Date.now() - 3000000 // 50 minutes ago (10 minutes remaining)
      };

      expect(storage.isTokenExpired(token)).toBe(false);
    });
  });

  describe('retrieve', () => {
    it('should return null when no tokens are stored', async () => {
      const result = await storage.retrieve();
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear tokens from storage', async () => {
      await storage.clear();
      const result = await storage.retrieve();
      expect(result).toBeNull();
    });
  });
});

describe('TokenStorage - Session Refresh Logic', () => {
  describe('Refresh Token Scenarios', () => {
    it('should identify when refresh is needed based on expiry', () => {
      const storage = new TokenStorage();

      // Token about to expire
      const nearExpiryToken: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        refresh_token: 'refresh_123',
        expires_in: 3600,
        token_type: 'Bearer',
        issued_at: Date.now() - 3500000 // ~58 minutes ago
      };

      expect(storage.isTokenExpired(nearExpiryToken)).toBe(true);
    });

    it('should not require refresh for long-lived tokens', () => {
      const storage = new TokenStorage();

      const freshToken: TokenResponse & { issued_at: number } = {
        access_token: 'access_123',
        refresh_token: 'refresh_123',
        expires_in: 86400, // 24 hours
        token_type: 'Bearer',
        issued_at: Date.now()
      };

      expect(storage.isTokenExpired(freshToken)).toBe(false);
    });
  });

  describe('Token Type Handling', () => {
    it('should recognize Bearer tokens', () => {
      const token: TokenResponse = {
        access_token: 'eyJhbG...',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      expect(token.token_type.toLowerCase()).toBe('bearer');
    });

    it('should recognize api-key token type', () => {
      const token: TokenResponse = {
        access_token: 'lano_123',
        expires_in: 0,
        token_type: 'api-key'
      };

      expect(token.token_type).toBe('api-key');
    });
  });
});

describe('TokenStorage - Error Handling', () => {
  describe('Parse Errors', () => {
    it('should handle invalid JSON in storage gracefully', async () => {
      const localStorageMock = createLocalStorageMock();
      localStorageMock.getItem = vi.fn().mockReturnValue('invalid json {{{');

      Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

      const storage = new TokenStorage();
      const result = await storage.retrieve();

      // Should return null on parse error
      expect(result).toBeNull();
    });
  });

  describe('Storage Access Errors', () => {
    it('should handle storage access errors gracefully', async () => {
      const storage = new TokenStorage();

      // Simulate error by making localStorage throw
      const errorMock = {
        getItem: vi.fn(() => { throw new Error('Storage access denied'); }),
        setItem: vi.fn(() => { throw new Error('Storage access denied'); }),
        removeItem: vi.fn(() => { throw new Error('Storage access denied'); })
      };

      Object.defineProperty(global, 'localStorage', { value: errorMock, writable: true });

      const result = await storage.retrieve();
      expect(result).toBeNull();
    });
  });
});
