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