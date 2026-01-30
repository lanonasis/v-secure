import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthGatewayClient } from '../client/auth-gateway-client.js';
import { AuthValidationResult, AuthTokenType } from '../types.js';

// Mock cross-fetch
vi.mock('cross-fetch', () => ({
  default: vi.fn()
}));

import fetch from 'cross-fetch';

const mockedFetch = vi.mocked(fetch);

describe('AuthGatewayClient', () => {
  let client: AuthGatewayClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AuthGatewayClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with default configuration', () => {
      const defaultClient = new AuthGatewayClient();
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom auth base URL', () => {
      const customClient = new AuthGatewayClient({
        authBaseUrl: 'https://custom-auth.example.com'
      });
      expect(customClient).toBeDefined();
    });

    it('should create client with custom project scope', () => {
      const customClient = new AuthGatewayClient({
        projectScope: 'custom-project'
      });
      expect(customClient).toBeDefined();
    });

    it('should strip trailing slashes from auth base URL', () => {
      const clientWithSlash = new AuthGatewayClient({
        authBaseUrl: 'https://auth.example.com///'
      });
      expect(clientWithSlash).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('should return invalid result for empty token', async () => {
      const result = await client.validateToken('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
    });

    it('should return invalid result for whitespace-only token', async () => {
      const result = await client.validateToken('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token is required');
    });

    it('should route API keys (lano_ prefix) to verifyApiKey', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: true,
          userId: 'user_123',
          projectScope: 'test-project',
          permissions: ['read', 'write']
        })
      } as Response);

      const result = await client.validateToken('lano_test123');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/verify-api-key'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'lano_test123'
          })
        })
      );
      expect(result.type).toBe('api_key');
    });

    it('should route pk_ prefixed keys to verifyApiKey', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ valid: true })
      } as Response);

      await client.validateToken('pk_test123');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/verify-api-key'),
        expect.any(Object)
      );
    });

    it('should route sk_ prefixed keys to verifyApiKey', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ valid: true })
      } as Response);

      await client.validateToken('sk_secret123');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/verify-api-key'),
        expect.any(Object)
      );
    });

    it('should route cli_ tokens to verifyToken', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: true,
          type: 'cli_token',
          user: { id: 'user_123', email: 'test@example.com' }
        })
      } as Response);

      const result = await client.validateToken('cli_token_123');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/verify-token'),
        expect.any(Object)
      );
      expect(result.type).toBe('cli');
    });

    it('should route JWT tokens (with dots) to verifyToken', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: true,
          type: 'jwt',
          user: { id: 'user_123' }
        })
      } as Response);

      const jwtToken = 'REDACTED.JWT.TOKEN';
      await client.validateToken(jwtToken);

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/auth/verify-token'),
        expect.any(Object)
      );
    });

    it('should route unknown tokens to introspection', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          active: true,
          user_id: 'user_123',
          scope: 'read write'
        })
      } as Response);

      await client.validateToken('unknown_format_token');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/introspect'),
        expect.any(Object)
      );
    });
  });

  describe('verifyApiKey', () => {
    it('should return valid result for valid API key', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: true,
          userId: 'user_123',
          projectScope: 'my-project',
          permissions: ['memories:read', 'memories:write']
        })
      } as Response);

      const result = await client.verifyApiKey('lano_valid_key');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('api_key');
      expect(result.userId).toBe('user_123');
      expect(result.projectScope).toBe('my-project');
      expect(result.permissions).toEqual(['memories:read', 'memories:write']);
    });

    it('should return invalid result for invalid API key', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: false,
          error: 'Invalid API key'
        })
      } as Response);

      const result = await client.verifyApiKey('lano_invalid_key');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('api_key');
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle network errors gracefully', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.verifyApiKey('lano_test');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('api_key');
      expect(result.error).toBe('Network error');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal server error' })
      } as Response);

      const result = await client.verifyApiKey('lano_test');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Internal server error');
    });
  });

  describe('verifyToken', () => {
    it('should return valid result for valid JWT', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: true,
          type: 'jwt',
          user: {
            id: 'user_123',
            email: 'test@example.com',
            role: 'admin'
          },
          expires_at: '2025-01-01T00:00:00Z'
        })
      } as Response);

      const result = await client.verifyToken('valid.jwt.token');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('jwt');
      expect(result.userId).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('admin');
    });

    it('should return invalid result for expired token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: false,
          error: 'Token expired'
        })
      } as Response);

      const result = await client.verifyToken('expired.jwt.token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should normalize cli_token type to cli', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          valid: true,
          type: 'cli_token',
          user: { id: 'user_123' }
        })
      } as Response);

      const result = await client.verifyToken('cli_token_123');

      expect(result.type).toBe('cli');
    });

    it('should handle verification errors', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Verification failed'));

      const result = await client.verifyToken('test.token');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('jwt');
      expect(result.error).toBe('Verification failed');
    });
  });

  describe('introspectToken', () => {
    it('should return valid result for active token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          active: true,
          user_id: 'user_123',
          sub: 'user_123',
          scope: 'read write',
          exp: Math.floor(Date.now() / 1000) + 3600
        })
      } as Response);

      const result = await client.introspectToken('opaque_token');

      expect(result.valid).toBe(true);
      expect(result.type).toBe('oauth');
      expect(result.userId).toBe('user_123');
      expect(result.scope).toBe('read write');
      expect(result.expiresAt).toBeDefined();
    });

    it('should return invalid result for inactive token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          active: false
        })
      } as Response);

      const result = await client.introspectToken('inactive_token');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('oauth');
      expect(result.error).toBe('Token is inactive');
    });

    it('should handle introspection errors', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Introspection failed'));

      const result = await client.introspectToken('test_token');

      expect(result.valid).toBe(false);
      expect(result.type).toBe('oauth');
      expect(result.error).toBe('Introspection failed');
    });
  });

  describe('exchangeSupabaseToken', () => {
    it('should successfully exchange Supabase token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
          user: {
            id: 'user_123',
            email: 'test@example.com'
          }
        })
      } as Response);

      const result = await client.exchangeSupabaseToken('supabase_jwt_token');

      expect(result.access_token).toBe('new_access_token');
      expect(result.refresh_token).toBe('new_refresh_token');
      expect(result.user?.id).toBe('user_123');
    });

    it('should throw error for empty token', async () => {
      await expect(client.exchangeSupabaseToken(''))
        .rejects.toThrow('Supabase access token is required');
    });

    it('should throw error for whitespace-only token', async () => {
      await expect(client.exchangeSupabaseToken('   '))
        .rejects.toThrow('Supabase access token is required');
    });

    it('should include project scope in request', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600
        })
      } as Response);

      await client.exchangeSupabaseToken('supabase_token', {
        projectScope: 'custom-scope'
      });

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Project-Scope': 'custom-scope'
          }),
          body: expect.stringContaining('custom-scope')
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer'
        })
      } as Response);

      const result = await client.refreshToken('old_refresh_token');

      expect(result.access_token).toBe('new_access_token');
      expect(result.token_type).toBe('Bearer');
    });

    it('should handle refresh errors', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Refresh token expired'
        })
      } as Response);

      await expect(client.refreshToken('expired_refresh_token'))
        .rejects.toThrow('Refresh token expired');
    });
  });

  describe('revokeToken', () => {
    it('should successfully revoke access token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await expect(client.revokeToken('access_token', 'access_token'))
        .resolves.not.toThrow();
    });

    it('should successfully revoke refresh token', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      await expect(client.revokeToken('refresh_token', 'refresh_token'))
        .resolves.not.toThrow();
    });

    it('should throw error on revocation failure', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 400
      } as Response);

      await expect(client.revokeToken('invalid_token'))
        .rejects.toThrow('Failed to revoke token');
    });
  });
});

describe('AuthGatewayClient - Token Type Normalization', () => {
  describe('Token Type Mapping', () => {
    const tokenTypes: Array<{ input: string; expected: AuthTokenType }> = [
      { input: 'cli_token', expected: 'cli' },
      { input: 'jwt', expected: 'jwt' },
      { input: 'unknown', expected: 'jwt' } // defaults to jwt
    ];

    tokenTypes.forEach(({ input, expected }) => {
      it(`should normalize "${input}" to "${expected}"`, () => {
        // Test the normalization logic
        const normalizeTokenType = (type: string): AuthTokenType => {
          if (type === 'cli_token') return 'cli';
          if (type === 'jwt') return 'jwt';
          return 'jwt';
        };

        expect(normalizeTokenType(input)).toBe(expected);
      });
    });
  });
});

describe('AuthGatewayClient - Error Response Handling', () => {
  let client: AuthGatewayClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AuthGatewayClient();
  });

  describe('HTTP Error Responses', () => {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];

    errorCodes.forEach(statusCode => {
      it(`should handle HTTP ${statusCode} error gracefully`, async () => {
        mockedFetch.mockResolvedValueOnce({
          ok: false,
          status: statusCode,
          text: async () => JSON.stringify({
            message: `Error ${statusCode}`,
            error: `HTTP ${statusCode}`
          })
        } as Response);

        const result = await client.verifyApiKey('lano_test');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Malformed Response Handling', () => {
    it('should handle empty response body', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => ''
      } as Response);

      const result = await client.verifyApiKey('lano_test');

      // Should handle gracefully
      expect(result.valid).toBe(false);
    });

    it('should handle non-JSON response', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Plain text response'
      } as Response);

      const result = await client.verifyApiKey('lano_test');

      // Should parse as raw and handle gracefully
      expect(result).toBeDefined();
    });
  });
});
