/**
 * MagicLinkFlow Tests
 *
 * Tests for OTP code and magic link authentication flows.
 * Covers both CLI (6-digit code) and web (magic link) authentication paths.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MagicLinkFlow, OTPSendResponse, OTPVerifyResponse } from '../flows/magic-link-flow';

// Mock cross-fetch
vi.mock('cross-fetch', () => ({
  default: vi.fn()
}));

import fetch from 'cross-fetch';

const mockedFetch = vi.mocked(fetch);

describe('MagicLinkFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should create flow with required config', () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });
      expect(flow).toBeDefined();
    });

    it('should use default authBaseUrl when not provided', () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });
      expect(flow).toBeDefined();
    });

    it('should use custom authBaseUrl when provided', () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://custom-auth.example.com'
      });
      expect(flow).toBeDefined();
    });

    it('should use default projectScope (lanonasis-maas)', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('test@example.com');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"project_scope":"lanonasis-maas"')
        })
      );
    });

    it('should use custom projectScope when provided', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        projectScope: 'custom-project'
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('test@example.com');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"project_scope":"custom-project"')
        })
      );
    });

    it('should use default platform (cli)', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('test@example.com');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"platform":"cli"')
        })
      );
    });

    it('should use custom platform when provided', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        platform: 'web'
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('test@example.com');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"platform":"web"')
        })
      );
    });
  });

  // ============================================================================
  // authenticate() Tests
  // ============================================================================

  describe('authenticate', () => {
    it('should throw error explaining two-step flow requirement', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      await expect(flow.authenticate()).rejects.toThrow(
        'MagicLinkFlow requires two-step authentication'
      );
    });

    it('should suggest using requestOTP() + verifyOTP() for CLI', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      await expect(flow.authenticate()).rejects.toThrow(
        /requestOTP\(\) \+ verifyOTP\(\)/
      );
    });
  });

  // ============================================================================
  // requestOTP() Tests
  // ============================================================================

  describe('requestOTP', () => {
    it('should send OTP request successfully', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      const mockResponse: OTPSendResponse = {
        success: true,
        message: 'OTP code sent! Check your email inbox for the 6-digit code.',
        type: 'email',
        expires_in: 600
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await flow.requestOTP('test@example.com');

      expect(result).toEqual(mockResponse);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/v1/auth/otp/send',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should normalize email to lowercase', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('TEST@EXAMPLE.COM');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"email":"test@example.com"')
        })
      );
    });

    it('should trim whitespace from email', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('  test@example.com  ');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"email":"test@example.com"')
        })
      );
    });

    it('should throw error for empty email', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      await expect(flow.requestOTP('')).rejects.toThrow(
        'Invalid email: a non-empty email address is required'
      );
    });

    it('should throw error for whitespace-only email', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      await expect(flow.requestOTP('   ')).rejects.toThrow(
        'Invalid email: a non-empty email address is required'
      );
    });

    it('should throw error with server message on failure', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid email format', code: 'INVALID_EMAIL', message: 'Please provide a valid email' })
      } as Response);

      await expect(flow.requestOTP('invalid')).rejects.toThrow('Please provide a valid email');
    });

    it('should request type "email" for 6-digit code', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'OTP sent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.requestOTP('test@example.com');

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"type":"email"')
        })
      );
    });
  });

  // ============================================================================
  // verifyOTP() Tests
  // ============================================================================

  describe('verifyOTP', () => {
    it('should verify OTP successfully and return tokens', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      const mockResponse: OTPVerifyResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIs...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'lanonasis-maas',
        auth_method: 'otp',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'authenticated'
        }
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await flow.verifyOTP('test@example.com', '123456');

      expect(result).toEqual(mockResponse);
      expect(result.access_token).toBeDefined();
      expect(result.auth_method).toBe('otp');
    });

    it('should call correct endpoint', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', auth_method: 'otp' })
      } as Response);

      await flow.verifyOTP('test@example.com', '123456');

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/v1/auth/otp/verify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should normalize email and trim code', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', auth_method: 'otp' })
      } as Response);

      await flow.verifyOTP('  TEST@EXAMPLE.COM  ', '  123456  ');

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.email).toBe('test@example.com');
      expect(calledBody.token).toBe('123456');
    });

    it('should throw error for invalid OTP', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid or expired OTP code',
          code: 'OTP_INVALID',
          message: 'The code you entered is invalid or has expired'
        })
      } as Response);

      await expect(flow.verifyOTP('test@example.com', '000000')).rejects.toThrow(
        'The code you entered is invalid or has expired'
      );
    });

    it('should throw generic error when no message provided', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      } as Response);

      await expect(flow.verifyOTP('test@example.com', '123456')).rejects.toThrow(
        'Invalid or expired OTP code'
      );
    });
  });

  // ============================================================================
  // resendOTP() Tests
  // ============================================================================

  describe('resendOTP', () => {
    it('should resend OTP successfully', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      const mockResponse: OTPSendResponse = {
        success: true,
        message: 'OTP code resent successfully',
        type: 'email',
        expires_in: 600
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await flow.resendOTP('test@example.com');

      expect(result).toEqual(mockResponse);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/v1/auth/otp/resend',
        expect.any(Object)
      );
    });

    it('should throw rate limit error on 429', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limited', code: 'OTP_RATE_LIMITED' })
      } as Response);

      await expect(flow.resendOTP('test@example.com')).rejects.toThrow(
        'Rate limited. Please wait before requesting another code.'
      );
    });

    it('should throw error with server message on non-429 failure', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'User not found', message: 'No account exists for this email' })
      } as Response);

      await expect(flow.resendOTP('nonexistent@example.com')).rejects.toThrow(
        'No account exists for this email'
      );
    });

    it('should normalize email', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Resent', type: 'email', expires_in: 600 })
      } as Response);

      await flow.resendOTP('  Test@Example.COM  ');

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.email).toBe('test@example.com');
    });
  });

  // ============================================================================
  // requestMagicLink() Tests
  // ============================================================================

  describe('requestMagicLink', () => {
    it('should send magic link request successfully', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      const mockResponse: OTPSendResponse = {
        success: true,
        message: 'Magic link sent! Check your email and click the link to sign in.',
        type: 'magiclink',
        expires_in: 600
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await flow.requestMagicLink('test@example.com', 'https://myapp.com/callback');

      expect(result).toEqual(mockResponse);
      expect(result.type).toBe('magiclink');
    });

    it('should include redirect_uri in request', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, type: 'magiclink', expires_in: 600 })
      } as Response);

      await flow.requestMagicLink('test@example.com', 'https://myapp.com/auth/callback');

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.redirect_uri).toBe('https://myapp.com/auth/callback');
      expect(calledBody.type).toBe('magiclink');
    });

    it('should throw error on failure', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid redirect_uri',
          code: 'INVALID_REDIRECT_URI',
          message: 'redirect_uri must be a valid URL'
        })
      } as Response);

      await expect(
        flow.requestMagicLink('test@example.com', 'not-a-url')
      ).rejects.toThrow('redirect_uri must be a valid URL');
    });
  });

  // ============================================================================
  // requestMagicLinkWeb() Tests
  // ============================================================================

  describe('requestMagicLinkWeb', () => {
    it('should send web-optimized magic link request', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Magic link sent' })
      } as Response);

      const result = await flow.requestMagicLinkWeb('test@example.com', 'https://myapp.com/callback');

      expect(result.success).toBe(true);
      expect(mockedFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/v1/auth/magic-link',
        expect.any(Object)
      );
    });

    it('should include create_user=true by default', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await flow.requestMagicLinkWeb('test@example.com', 'https://myapp.com/callback');

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.create_user).toBe(true);
    });

    it('should allow create_user=false', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await flow.requestMagicLinkWeb('test@example.com', 'https://myapp.com/callback', false);

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.create_user).toBe(false);
    });

    it('should set platform to web', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client', platform: 'cli' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await flow.requestMagicLinkWeb('test@example.com', 'https://myapp.com/callback');

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.platform).toBe('web');
    });

    it('should throw error on failure', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error', message: 'Failed to send magic link' })
      } as Response);

      await expect(
        flow.requestMagicLinkWeb('test@example.com', 'https://myapp.com/callback')
      ).rejects.toThrow('Failed to send magic link');
    });
  });

  // ============================================================================
  // exchangeMagicLinkToken() Tests
  // ============================================================================

  describe('exchangeMagicLinkToken', () => {
    it('should exchange token successfully', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        redirect_to: 'https://myapp.com/dashboard',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          project_scope: 'lanonasis-maas'
        }
      };

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await flow.exchangeMagicLinkToken('supabase-token', 'state-123');

      expect(result).toEqual(mockResponse);
      expect(result.redirect_to).toBeDefined();
    });

    it('should call correct endpoint with authorization header', async () => {
      const flow = new MagicLinkFlow({
        clientId: 'test-client',
        authBaseUrl: 'https://auth.lanonasis.com'
      });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' })
      } as Response);

      await flow.exchangeMagicLinkToken('supabase-access-token', 'state-abc');

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://auth.lanonasis.com/v1/auth/magic-link/exchange',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer supabase-access-token'
          }
        })
      );
    });

    it('should include state in request body', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' })
      } as Response);

      await flow.exchangeMagicLinkToken('supabase-token', 'state-xyz');

      const calledBody = JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string);
      expect(calledBody.state).toBe('state-xyz');
    });

    it('should throw error on failure', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid state',
          message: 'Magic link exchange failed - state mismatch'
        })
      } as Response);

      await expect(
        flow.exchangeMagicLinkToken('supabase-token', 'invalid-state')
      ).rejects.toThrow('Magic link exchange failed - state mismatch');
    });

    it('should throw generic error when no message provided', async () => {
      const flow = new MagicLinkFlow({ clientId: 'test-client' });

      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      } as Response);

      await expect(
        flow.exchangeMagicLinkToken('token', 'state')
      ).rejects.toThrow('Magic link exchange failed');
    });
  });

  // ============================================================================
  // Static Utility Method Tests
  // ============================================================================

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(MagicLinkFlow.isValidEmail('test@example.com')).toBe(true);
      expect(MagicLinkFlow.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(MagicLinkFlow.isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(MagicLinkFlow.isValidEmail('not-an-email')).toBe(false);
      expect(MagicLinkFlow.isValidEmail('missing@domain')).toBe(false);
      expect(MagicLinkFlow.isValidEmail('@nodomain.com')).toBe(false);
      expect(MagicLinkFlow.isValidEmail('spaces in@email.com')).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(MagicLinkFlow.isValidEmail('  test@example.com  ')).toBe(true);
    });
  });

  describe('isValidOTPCode', () => {
    it('should return true for valid 6-digit codes', () => {
      expect(MagicLinkFlow.isValidOTPCode('123456')).toBe(true);
      expect(MagicLinkFlow.isValidOTPCode('000000')).toBe(true);
      expect(MagicLinkFlow.isValidOTPCode('999999')).toBe(true);
    });

    it('should return false for codes with wrong length', () => {
      expect(MagicLinkFlow.isValidOTPCode('12345')).toBe(false);
      expect(MagicLinkFlow.isValidOTPCode('1234567')).toBe(false);
      expect(MagicLinkFlow.isValidOTPCode('')).toBe(false);
    });

    it('should return false for codes with non-digit characters', () => {
      expect(MagicLinkFlow.isValidOTPCode('12345a')).toBe(false);
      expect(MagicLinkFlow.isValidOTPCode('abcdef')).toBe(false);
      expect(MagicLinkFlow.isValidOTPCode('12-456')).toBe(false);
      expect(MagicLinkFlow.isValidOTPCode('12 456')).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(MagicLinkFlow.isValidOTPCode('  123456  ')).toBe(true);
      expect(MagicLinkFlow.isValidOTPCode('\t123456\n')).toBe(true);
    });
  });
});
