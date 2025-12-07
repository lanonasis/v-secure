import fetch from 'cross-fetch';
import { TokenResponse, OAuthConfig, AuthError } from '../types';

export abstract class BaseOAuthFlow {
  protected readonly clientId: string;
  protected readonly authBaseUrl: string;
  protected readonly scope: string;

  constructor(config: OAuthConfig) {
    this.clientId = config.clientId;
    this.authBaseUrl = config.authBaseUrl || 'https://auth.lanonasis.com';
    this.scope = config.scope || 'memories:read memories:write memories:delete profile';
  }

  abstract authenticate(): Promise<TokenResponse>;

  protected async makeTokenRequest(body: Record<string, string>): Promise<TokenResponse> {
    const response = await fetch(`${this.authBaseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as AuthError).error_description || 'Token request failed');
    }

    return data as TokenResponse;
  }

  protected generateState(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && (crypto as Crypto).getRandomValues) {
      (crypto as Crypto).getRandomValues(array);
    } else {
      throw new Error('Secure random generation is not available');
    }
    return this.base64URLEncode(array);
  }

  protected base64URLEncode(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const base64 = typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.makeTokenRequest({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId
    });
  }

  async revokeToken(token: string, tokenType: 'access_token' | 'refresh_token' = 'access_token'): Promise<void> {
    const response = await fetch(`${this.authBaseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        token_type_hint: tokenType,
        client_id: this.clientId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to revoke token');
    }
  }
}
