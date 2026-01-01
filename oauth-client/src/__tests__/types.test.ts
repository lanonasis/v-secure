import { describe, it, expect } from 'vitest';
import type {
  TokenResponse,
  DeviceCodeResponse,
  OAuthConfig,
  AuthError,
  GrantType,
  PKCEChallenge
} from '../types';

describe('OAuth Types', () => {
  describe('TokenResponse', () => {
    it('should accept valid token response with required fields', () => {
      const token: TokenResponse = {
        access_token: 'test_access_token',
        expires_in: 3600,
        token_type: 'Bearer'
      };
      
      expect(token.access_token).toBe('test_access_token');
      expect(token.expires_in).toBe(3600);
      expect(token.token_type).toBe('Bearer');
    });

    it('should accept token response with optional fields', () => {
      const token: TokenResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'memories:read memories:write',
        issued_at: Date.now()
      };
      
      expect(token.refresh_token).toBe('test_refresh_token');
      expect(token.scope).toBe('memories:read memories:write');
      expect(token.issued_at).toBeDefined();
    });

    it('should handle API key token type', () => {
      const apiKeyToken: TokenResponse = {
        access_token: 'onasis_api_key_123',
        expires_in: 0,
        token_type: 'api-key'
      };
      
      expect(apiKeyToken.token_type).toBe('api-key');
      expect(apiKeyToken.expires_in).toBe(0);
    });
  });

  describe('DeviceCodeResponse', () => {
    it('should accept valid device code response', () => {
      const deviceCode: DeviceCodeResponse = {
        device_code: 'device_123',
        user_code: 'ABC-123',
        verification_uri: 'https://auth.lanonasis.com/device',
        expires_in: 600,
        interval: 5
      };
      
      expect(deviceCode.device_code).toBe('device_123');
      expect(deviceCode.user_code).toBe('ABC-123');
      expect(deviceCode.verification_uri).toBe('https://auth.lanonasis.com/device');
    });

    it('should accept device code with complete verification URI', () => {
      const deviceCode: DeviceCodeResponse = {
        device_code: 'device_123',
        user_code: 'ABC-123',
        verification_uri: 'https://auth.lanonasis.com/device',
        verification_uri_complete: 'https://auth.lanonasis.com/device?user_code=ABC-123',
        expires_in: 600,
        interval: 5
      };
      
      expect(deviceCode.verification_uri_complete).toContain('ABC-123');
    });
  });

  describe('OAuthConfig', () => {
    it('should accept minimal config with only clientId', () => {
      const config: OAuthConfig = {
        clientId: 'test_client_id'
      };
      
      expect(config.clientId).toBe('test_client_id');
      expect(config.authBaseUrl).toBeUndefined();
    });

    it('should accept full config with all options', () => {
      const config: OAuthConfig = {
        clientId: 'test_client_id',
        authBaseUrl: 'https://custom-auth.example.com',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'custom:scope'
      };
      
      expect(config.authBaseUrl).toBe('https://custom-auth.example.com');
      expect(config.redirectUri).toBe('http://localhost:3000/callback');
      expect(config.scope).toBe('custom:scope');
    });
  });

  describe('AuthError', () => {
    it('should accept error with description', () => {
      const error: AuthError = {
        error: 'invalid_grant',
        error_description: 'The authorization code has expired'
      };
      
      expect(error.error).toBe('invalid_grant');
      expect(error.error_description).toBe('The authorization code has expired');
    });

    it('should accept error without description', () => {
      const error: AuthError = {
        error: 'access_denied'
      };
      
      expect(error.error).toBe('access_denied');
      expect(error.error_description).toBeUndefined();
    });
  });

  describe('GrantType', () => {
    it('should accept valid grant types', () => {
      const authCode: GrantType = 'authorization_code';
      const deviceCode: GrantType = 'urn:ietf:params:oauth:grant-type:device_code';
      const refresh: GrantType = 'refresh_token';
      
      expect(authCode).toBe('authorization_code');
      expect(deviceCode).toBe('urn:ietf:params:oauth:grant-type:device_code');
      expect(refresh).toBe('refresh_token');
    });
  });

  describe('PKCEChallenge', () => {
    it('should accept valid PKCE challenge', () => {
      const pkce: PKCEChallenge = {
        codeVerifier: 'random_verifier_string_43_chars_minimum_length',
        codeChallenge: 'base64url_encoded_sha256_hash'
      };
      
      expect(pkce.codeVerifier).toBeDefined();
      expect(pkce.codeChallenge).toBeDefined();
    });
  });
});
