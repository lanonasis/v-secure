export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
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