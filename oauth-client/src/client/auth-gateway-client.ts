import fetch from 'cross-fetch';
import { BaseOAuthFlow } from '../flows/base-flow';
import type {
  AuthGatewayClientConfig,
  AuthValidationResult,
  AuthTokenType,
  TokenExchangeOptions,
  TokenExchangeResponse,
  TokenResponse
} from '../types';

class GatewayOAuthFlow extends BaseOAuthFlow {
  async authenticate(): Promise<TokenResponse> {
    throw new Error('Interactive authentication is not supported in AuthGatewayClient.');
  }
}

const DEFAULT_AUTH_BASE_URL = 'https://auth.lanonasis.com';
const DEFAULT_CLIENT_ID = 'lanonasis-cli';
const DEFAULT_PROJECT_SCOPE = 'lanonasis-maas';
const API_KEY_PREFIXES = ['lano_', 'pk_', 'sk_'];

export class AuthGatewayClient {
  private authBaseUrl: string;
  private projectScope: string;
  private flow: GatewayOAuthFlow;

  constructor(config: AuthGatewayClientConfig = {}) {
    const baseUrl = config.authBaseUrl || DEFAULT_AUTH_BASE_URL;
    this.authBaseUrl = baseUrl.replace(/\/+$/, '');
    this.projectScope = config.projectScope || DEFAULT_PROJECT_SCOPE;
    this.flow = new GatewayOAuthFlow({
      clientId: config.clientId || DEFAULT_CLIENT_ID,
      authBaseUrl: this.authBaseUrl
    });
  }

  async exchangeSupabaseToken(
    supabaseToken: string,
    options: TokenExchangeOptions = {}
  ): Promise<TokenExchangeResponse> {
    const token = typeof supabaseToken === 'string' ? supabaseToken.trim() : '';
    if (!token) {
      throw new Error('Supabase access token is required');
    }

    const projectScope = options.projectScope || this.projectScope;
    const platform = options.platform || 'web';

    return this.requestJson('/v1/auth/token/exchange', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Project-Scope': projectScope
      },
      body: JSON.stringify({
        project_scope: projectScope,
        platform
      })
    });
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.flow.refreshToken(refreshToken);
  }

  async revokeToken(
    token: string,
    tokenType: 'access_token' | 'refresh_token' = 'access_token'
  ): Promise<void> {
    return this.flow.revokeToken(token, tokenType);
  }

  async validateToken(token: string): Promise<AuthValidationResult> {
    const trimmed = typeof token === 'string' ? token.trim() : '';
    if (!trimmed) {
      return { valid: false, error: 'Token is required' };
    }

    if (API_KEY_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      return this.verifyApiKey(trimmed);
    }

    if (trimmed.startsWith('cli_') || trimmed.includes('.')) {
      return this.verifyToken(trimmed);
    }

    return this.introspectToken(trimmed);
  }

  async verifyApiKey(apiKey: string): Promise<AuthValidationResult> {
    try {
      const data = await this.requestJson('/v1/auth/verify-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        }
      });

      if (!data || data.valid === false) {
        return {
          valid: false,
          type: 'api_key',
          error: (data && (data.error || data.message)) || 'Invalid API key',
          raw: data
        };
      }

      return {
        valid: true,
        type: 'api_key',
        userId: data.userId,
        projectScope: data.projectScope,
        permissions: data.permissions || [],
        raw: data
      };
    } catch (error: any) {
      return {
        valid: false,
        type: 'api_key',
        error: error?.message || 'API key validation failed',
        raw: error?.data
      };
    }
  }

  async verifyToken(token: string): Promise<AuthValidationResult> {
    try {
      const data = await this.requestJson('/v1/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!data || data.valid === false) {
        return {
          valid: false,
          type: data?.type ? this.normalizeTokenType(data.type) : 'jwt',
          error: data?.error || 'Invalid token',
          raw: data
        };
      }

      return {
        valid: true,
        type: data.type ? this.normalizeTokenType(data.type) : 'jwt',
        userId: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        expiresAt: data.expires_at || null,
        raw: data
      };
    } catch (error: any) {
      return {
        valid: false,
        type: 'jwt',
        error: error?.message || 'Token verification failed',
        raw: error?.data
      };
    }
  }

  async introspectToken(token: string): Promise<AuthValidationResult> {
    try {
      const data = await this.requestJson('/oauth/introspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!data || data.active !== true) {
        return {
          valid: false,
          type: 'oauth',
          error: 'Token is inactive',
          raw: data
        };
      }

      return {
        valid: true,
        type: 'oauth',
        userId: data.user_id || data.sub,
        scope: data.scope,
        expiresAt: data.exp ? new Date(data.exp * 1000).toISOString() : null,
        raw: data
      };
    } catch (error: any) {
      return {
        valid: false,
        type: 'oauth',
        error: error?.message || 'Token introspection failed',
        raw: error?.data
      };
    }
  }

  private normalizeTokenType(type: string): AuthTokenType {
    if (type === 'cli_token') return 'cli';
    if (type === 'jwt') return 'jwt';
    return 'jwt';
  }

  private async requestJson(path: string, options: RequestInit): Promise<any> {
    const response = await fetch(`${this.authBaseUrl}${path.startsWith('/') ? path : `/${path}`}`, options);
    const text = await response.text();
    let data: any = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const message = data?.message || data?.error || `Request failed (${response.status})`;
      const error = new Error(message) as Error & { status?: number; data?: any };
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}
