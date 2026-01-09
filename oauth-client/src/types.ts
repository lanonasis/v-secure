export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  issued_at?: number;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval: number;
}

export interface OAuthConfig {
  clientId: string;
  authBaseUrl?: string;
  redirectUri?: string;
  scope?: string;
}

export interface AuthError {
  error: string;
  error_description?: string;
}

export type GrantType = 
  | 'authorization_code' 
  | 'urn:ietf:params:oauth:grant-type:device_code' 
  | 'refresh_token';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

export type AuthTokenType = 'api_key' | 'jwt' | 'oauth' | 'cli';

export interface AuthValidationResult {
  valid: boolean;
  type?: AuthTokenType;
  userId?: string;
  email?: string;
  role?: string;
  projectScope?: string;
  permissions?: string[];
  scope?: string | string[];
  expiresAt?: string | null;
  error?: string;
  raw?: unknown;
}

export interface AuthGatewayClientConfig {
  authBaseUrl?: string;
  clientId?: string;
  projectScope?: string;
}

export interface TokenExchangeOptions {
  projectScope?: string;
  platform?: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
  user?: {
    id: string;
    email?: string;
    role?: string;
    project_scope?: string;
  };
  [key: string]: unknown;
}
