/**
 * Magic Link / OTP Flow
 *
 * Passwordless authentication supporting two modes:
 * 1. OTP Code (type: 'email') - User receives 6-digit code to enter manually (CLI, mobile)
 * 2. Magic Link (type: 'magiclink') - User clicks link in email (web, desktop)
 *
 * Usage:
 * ```typescript
 * // OTP Code Flow (CLI)
 * const flow = new MagicLinkFlow({ clientId: 'my-app' });
 * await flow.requestOTP('user@example.com');
 * const tokens = await flow.verifyOTP('user@example.com', '123456');
 *
 * // Magic Link Flow (Web)
 * const flow = new MagicLinkFlow({ clientId: 'my-app' });
 * await flow.requestMagicLink('user@example.com', 'https://myapp.com/auth/callback');
 * // User clicks link in email, then:
 * const tokens = await flow.exchangeMagicLinkToken(supabaseAccessToken, state);
 * ```
 */

import fetch from 'cross-fetch';
import { BaseOAuthFlow } from './base-flow';
import type { OAuthConfig, TokenResponse } from '../types';

export type OTPType = 'email' | 'magiclink';
export type Platform = 'cli' | 'web' | 'mcp' | 'api';

export interface MagicLinkConfig extends OAuthConfig {
  projectScope?: string;
  platform?: Platform;
}

export interface OTPSendResponse {
  success: boolean;
  message: string;
  type: OTPType;
  expires_in: number;
}

export interface OTPVerifyResponse extends TokenResponse {
  auth_method: 'otp' | 'magic_link';
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface MagicLinkExchangeResponse extends TokenResponse {
  redirect_to?: string;
  user?: {
    id: string;
    email?: string;
    role?: string;
    project_scope?: string;
  };
}

export class MagicLinkFlow extends BaseOAuthFlow {
  private readonly projectScope: string;
  private readonly platform: Platform;

  constructor(config: MagicLinkConfig) {
    super(config);
    this.projectScope = config.projectScope || 'lanonasis-maas';
    this.platform = config.platform || 'cli';
  }

  /**
   * Main authenticate method - uses OTP code flow by default
   * For interactive CLI usage, prefer using requestOTP() and verifyOTP() separately
   */
  async authenticate(): Promise<TokenResponse> {
    throw new Error(
      'MagicLinkFlow requires two-step authentication. ' +
      'Use requestOTP() + verifyOTP() for CLI, or requestMagicLink() for web.'
    );
  }

  // ============================================================================
  // OTP Code Flow (for CLI, mobile - user enters code manually)
  // ============================================================================

  /**
   * Request a 6-digit OTP code to be sent via email
   * User will enter this code manually in the CLI
   *
   * @param email - User's email address
   * @returns Response with success status and expiration time
   */
  async requestOTP(email: string): Promise<OTPSendResponse> {
    if (typeof email !== 'string' || !email.trim()) {
      throw new Error('Invalid email: a non-empty email address is required to request an OTP.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const response = await fetch(`${this.authBaseUrl}/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        type: 'email', // Explicitly request 6-digit code, not magic link
        platform: this.platform,
        project_scope: this.projectScope,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to send OTP');
    }

    return data as OTPSendResponse;
  }

  /**
   * Verify the OTP code entered by the user and get tokens
   *
   * @param email - User's email address (must match the one used in requestOTP)
   * @param code - 6-digit OTP code from email
   * @returns Token response with access_token, refresh_token, etc.
   */
  async verifyOTP(email: string, code: string): Promise<OTPVerifyResponse> {
    const response = await fetch(`${this.authBaseUrl}/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
        platform: this.platform,
        project_scope: this.projectScope,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Invalid or expired OTP code');
    }

    return data as OTPVerifyResponse;
  }

  /**
   * Resend OTP code (rate limited)
   *
   * @param email - User's email address
   * @returns Response with success status
   */
  async resendOTP(email: string): Promise<OTPSendResponse> {
    const response = await fetch(`${this.authBaseUrl}/v1/auth/otp/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        type: 'email',
        platform: this.platform,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited. Please wait before requesting another code.');
      }
      throw new Error(data.message || data.error || 'Failed to resend OTP');
    }

    return data as OTPSendResponse;
  }

  // ============================================================================
  // Magic Link Flow (for web, desktop - user clicks link in email)
  // ============================================================================

  /**
   * Request a magic link to be sent via email
   * User will click the link which redirects to your callback URL
   *
   * @param email - User's email address
   * @param redirectUri - URL to redirect to after clicking the magic link
   * @returns Response with success status
   */
  async requestMagicLink(email: string, redirectUri: string): Promise<OTPSendResponse> {
    const response = await fetch(`${this.authBaseUrl}/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        type: 'magiclink',
        redirect_uri: redirectUri,
        platform: this.platform,
        project_scope: this.projectScope,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to send magic link');
    }

    return data as OTPSendResponse;
  }

  /**
   * Alternative: Use the /v1/auth/magic-link endpoint (web-optimized)
   * This endpoint provides better redirect handling for web apps
   *
   * @param email - User's email address
   * @param redirectUri - URL to redirect to after authentication
   * @param createUser - Whether to create a new user if email doesn't exist
   */
  async requestMagicLinkWeb(
    email: string,
    redirectUri: string,
    createUser: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.authBaseUrl}/v1/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        redirect_uri: redirectUri,
        return_to: redirectUri, // Alias for compatibility
        project_scope: this.projectScope,
        platform: 'web',
        create_user: createUser,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to send magic link');
    }

    return data;
  }

  /**
   * Exchange magic link token for auth-gateway tokens
   * Called after user clicks the magic link and is redirected to your callback
   *
   * @param supabaseAccessToken - Access token from Supabase (from URL hash/query)
   * @param state - State parameter from the callback URL
   * @returns Token response with redirect URL
   */
  async exchangeMagicLinkToken(
    supabaseAccessToken: string,
    state: string
  ): Promise<MagicLinkExchangeResponse> {
    const response = await fetch(`${this.authBaseUrl}/v1/auth/magic-link/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAccessToken}`,
      },
      body: JSON.stringify({ state }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Magic link exchange failed');
    }

    return data as MagicLinkExchangeResponse;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if an email is valid format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Check if an OTP code is valid format (6 digits).
   *
   * This method:
   * - Trims leading and trailing whitespace from the input before validating.
   * - Requires exactly 6 numeric digits (0–9); any non-numeric characters or
   *   incorrect length will cause it to return `false`.
   *
   * Note: This method expects a string value. Passing `null`, `undefined`, or
   * other non-string values will result in a runtime error when `.trim()` is
   * called, rather than returning `false`.
   *
   * @param code - The OTP code to validate.
   * @returns `true` if the trimmed code consists of exactly 6 digits, otherwise `false`.
   */
  static isValidOTPCode(code: string): boolean {
    return /^\d{6}$/.test(code.trim());
  }
}
