import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock cross-fetch - use vi.hoisted to ensure mockFetch is available before vi.mock runs
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn()
}));
vi.mock('cross-fetch', () => ({
  default: mockFetch
}));
import { APIKeyFlow } from '../flows/apikey-flow';

describe('APIKeyFlow', () => {
  let flow: APIKeyFlow;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default auth base URL', () => {
      flow = new APIKeyFlow('lano_test_key_123');
      expect(flow).toBeDefined();
    });

    it('should accept custom auth base URL', () => {
      flow = new APIKeyFlow('lano_test_key_123', 'https://custom.example.com');
      expect(flow).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('should return token response for valid lano_ prefixed key', async () => {
      flow = new APIKeyFlow('lano_test_key_123456789');
      const result = await flow.authenticate();

      expect(result.access_token).toBe('lano_test_key_123456789');
      expect(result.token_type).toBe('api-key');
      expect(result.expires_in).toBe(0);
      expect(result.issued_at).toBeDefined();
    });

    it('should return token response for valid vx_ prefixed key with deprecation warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      flow = new APIKeyFlow('vx_legacy_key_123456789');
      const result = await flow.authenticate();

      expect(result.access_token).toBe('vx_legacy_key_123456789');
      expect(result.token_type).toBe('api-key');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });

    it('should throw error for invalid key format (no prefix)', async () => {
      flow = new APIKeyFlow('invalid_key_without_prefix');
      
      await expect(flow.authenticate()).rejects.toThrow(
        'Invalid API key format. Must start with "lano_" or "vx_"'
      );
    });

    it('should throw error for empty key', async () => {
      flow = new APIKeyFlow('');
      
      await expect(flow.authenticate()).rejects.toThrow(
        'Invalid API key format'
      );
    });

    it('should throw error for key with wrong prefix', async () => {
      flow = new APIKeyFlow('sk_wrong_prefix_key');
      
      await expect(flow.authenticate()).rejects.toThrow(
        'Invalid API key format'
      );
    });
  });

  describe('refreshToken', () => {
    it('should throw error as API keys do not support refresh', async () => {
      flow = new APIKeyFlow('lano_test_key_123');
      
      await expect(flow.refreshToken('any_refresh_token')).rejects.toThrow(
        'API keys do not support token refresh'
      );
    });
  });

  describe('validateAPIKey', () => {
    it('should return true for valid API key', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);
      
      flow = new APIKeyFlow('lano_valid_key', 'https://mcp.lanonasis.com');
      const result = await flow.validateAPIKey();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://mcp.lanonasis.com/api/v1/health',
        expect.objectContaining({
          headers: { 'x-api-key': 'lano_valid_key' }
        })
      );
    });

    it('should return false for invalid API key', async () => {
      mockFetch.mockResolvedValue({ ok: false } as Response);
      
      flow = new APIKeyFlow('lano_invalid_key', 'https://mcp.lanonasis.com');
      const result = await flow.validateAPIKey();

      expect(result).toBe(false);
    });

    it('should return false and log error on network failure', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      flow = new APIKeyFlow('lano_test_key', 'https://mcp.lanonasis.com');
      const result = await flow.validateAPIKey();

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        'API key validation failed:',
        expect.any(Error)
      );
    });
  });

  describe('API Key Format Validation', () => {
    it('should accept lano_ prefix with various suffixes', async () => {
      const validKeys = [
        'lano_abc123',
        'lano_test_key_with_underscores',
        'lano_1234567890abcdef',
        'lano_UPPERCASE_mixed_123'
      ];

      for (const key of validKeys) {
        flow = new APIKeyFlow(key);
        const result = await flow.authenticate();
        expect(result.access_token).toBe(key);
      }
    });

    it('should accept vx_ prefix for backward compatibility', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const legacyKeys = [
        'vx_legacy_key',
        'vx_old_format_123'
      ];

      for (const key of legacyKeys) {
        flow = new APIKeyFlow(key);
        const result = await flow.authenticate();
        expect(result.access_token).toBe(key);
      }
    });
  });
});
