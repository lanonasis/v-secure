import fetch from 'cross-fetch';
import { BaseOAuthFlow } from './base-flow';
import { TokenResponse } from '../types';

/**
 * API Key Authentication Flow
 *
 * This flow uses a direct API key for authentication instead of OAuth.
 * The API key is sent via x-api-key header to the backend.
 */
export class APIKeyFlow extends BaseOAuthFlow {
  private apiKey: string;

  constructor(apiKey: string, authBaseUrl: string = 'https://mcp.lanonasis.com') {
    super({
      clientId: 'api-key-client',
      authBaseUrl
    });

    this.apiKey = apiKey;
  }

  /**
   * "Authenticate" by returning the API key as a virtual token
   * The API key will be used directly in request headers
   */
  async authenticate(): Promise<TokenResponse> {
    // Validate API key format - accept both lano_ and vx_ during migration
    if (!this.apiKey || (!this.apiKey.startsWith('lano_') && !this.apiKey.startsWith('vx_'))) {
      throw new Error(
        'Invalid API key format. Must start with "lano_" or "vx_". ' +
        'Please regenerate your API key from the dashboard.'
      );
    }

    // Warn about deprecated vx_ format
    if (this.apiKey.startsWith('vx_')) {
      console.warn(
        '⚠️  DEPRECATION WARNING: API keys with "vx_" prefix are deprecated and will stop working soon. ' +
        'Please regenerate your API key from the dashboard to get a "lano_" prefixed key. ' +
        'Support for "vx_" keys will be removed in a future version.'
      );
    }

    // Return virtual token response
    // The API key itself will be used in x-api-key header
    return {
      access_token: this.apiKey,
      token_type: 'api-key',
      expires_in: 0,  // API keys don't expire
      issued_at: Date.now()
    };
  }

  /**
   * API keys don't need refresh
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    throw new Error('API keys do not support token refresh');
  }

  /**
   * Optional: Validate API key by making a test request
   */
  async validateAPIKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.authBaseUrl}/api/v1/health`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      return response.ok;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }
}
