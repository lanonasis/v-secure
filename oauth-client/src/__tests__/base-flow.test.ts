import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { BaseOAuthFlow } from '../flows/base-flow';
import type { TokenResponse, OAuthConfig } from '../types';

// Mock cross-fetch
const mockFetch = vi.fn();
vi.mock('cross-fetch', () => ({
  default: mockFetch
}));

class TestOAuthFlow extends BaseOAuthFlow {
  async authenticate(): Promise<TokenResponse> {
    return {
      access_token: 'test_token',
      expires_in: 3600,
      token_type: 'Bearer'
    };
  }

  public testGenerateState(): string {
    return this.generateState();
  }

  public testBase64URLEncode(buffer: Uint8Array): string {
    return this.base64URLEncode(buffer);
  }

  public testMakeTokenRequest(body: Record<string, string>): Promise<TokenResponse> {
    return this.makeTokenRequest(body);
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getAuthBaseUrl(): string {
    return this.authBaseUrl;
  }

  public getScope(): string {
    return this.scope;
  }
}

describe('BaseOAuthFlow', () => {
  let flow: TestOAuthFlow;

  beforeEach(() => {
    flow = new TestOAuthFlow({ clientId: 'test_client' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(flow.getClientId()).toBe('test_client');
      expect(flow.getAuthBaseUrl()).toBe('https://auth.lanonasis.com');
      expect(flow.getScope()).toBe('memories:read memories:write memories:delete profile');
    });

    it('should accept custom config values', () => {
      const customFlow = new TestOAuthFlow({
        clientId: 'custom_client',
        authBaseUrl: 'https://custom-auth.example.com',
        scope: 'custom:scope'
      });

      expect(customFlow.getClientId()).toBe('custom_client');
      expect(customFlow.getAuthBaseUrl()).toBe('https://custom-auth.example.com');
      expect(customFlow.getScope()).toBe('custom:scope');
    });
  });

  describe('generateState', () => {
    it('should generate a non-empty state string', () => {
      const state = flow.testGenerateState();
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate unique states on each call', () => {
      const state1 = flow.testGenerateState();
      const state2 = flow.testGenerateState();
      expect(state1).not.toBe(state2);
    });

    it('should generate URL-safe base64 string', () => {
      const state = flow.testGenerateState();
      expect(state).not.toContain('+');
      expect(state).not.toContain('/');
      expect(state).not.toContain('=');
    });
  });

  describe('base64URLEncode', () => {
    it('should encode Uint8Array to base64url', () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = flow.testBase64URLEncode(input);
      expect(encoded).toBe('SGVsbG8');
    });

    it('should replace + with -', () => {
      const input = new Uint8Array([251, 255]); // produces + in standard base64
      const encoded = flow.testBase64URLEncode(input);
      expect(encoded).not.toContain('+');
    });

    it('should replace / with _', () => {
      const input = new Uint8Array([255, 254]); // produces / in standard base64
      const encoded = flow.testBase64URLEncode(input);
      expect(encoded).not.toContain('/');
    });

    it('should remove padding', () => {
      const input = new Uint8Array([65]); // "A" - would have padding
      const encoded = flow.testBase64URLEncode(input);
      expect(encoded).not.toContain('=');
    });
  });

  describe('makeTokenRequest', () => {
    it('should make POST request to token endpoint', async () => {
      const mockResponse = {
        access_token: 'new_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await flow.testMakeTokenRequest({
        grant_type: 'authorization_code',
        code: 'auth_code'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code'
        })
      } as Response);

      await expect(flow.testMakeTokenRequest({
        grant_type: 'authorization_code',
        code: 'invalid_code'
      })).rejects.toThrow('Invalid authorization code');
    });

    it('should use generic error message when description missing', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'server_error' })
      } as Response);

      await expect(flow.testMakeTokenRequest({
        grant_type: 'authorization_code',
        code: 'code'
      })).rejects.toThrow('Token request failed');
    });
  });

  describe('refreshToken', () => {
    it('should exchange refresh token for new access token', async () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await flow.refreshToken('old_refresh_token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/oauth/token',
        expect.objectContaining({
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: 'old_refresh_token',
            client_id: 'test_client'
          })
        })
      );
      expect(result.access_token).toBe('new_access_token');
    });
  });

  describe('revokeToken', () => {
    it('should revoke access token', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await flow.revokeToken('token_to_revoke');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/oauth/revoke',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: 'token_to_revoke',
            token_type_hint: 'access_token',
            client_id: 'test_client'
          })
        })
      );
    });

    it('should revoke refresh token when specified', async () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);

      await flow.revokeToken('refresh_token_to_revoke', 'refresh_token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/oauth/revoke',
        expect.objectContaining({
          body: JSON.stringify({
            token: 'refresh_token_to_revoke',
            token_type_hint: 'refresh_token',
            client_id: 'test_client'
          })
        })
      );
    });

    it('should throw error on failed revocation', async () => {
      mockFetch.mockResolvedValue({ ok: false } as Response);

      await expect(flow.revokeToken('token')).rejects.toThrow('Failed to revoke token');
    });
  });
});
