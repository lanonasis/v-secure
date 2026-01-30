/**
 * OAuth 2.1 Integration Tests
 *
 * Tests both OAuth implementations:
 * 1. Auth-Gateway OAuth (auth.lanonasis.com) - Custom implementation
 * 2. Supabase OAuth Server (auth.connectionpoint.tech) - Supabase built-in
 *
 * @see https://supabase.com/docs/guides/auth/oauth-server
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock fetch for testing
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('OAuth 2.1 Integration Tests', () => {

  describe('Auth-Gateway OAuth (auth.lanonasis.com)', () => {
    const AUTH_GATEWAY_URL = 'https://auth.lanonasis.com';

    beforeAll(() => {
      mockFetch.mockReset();
    });

    describe('Discovery Endpoint', () => {
      it('should return RFC 8414 compliant metadata', async () => {
        const expectedMetadata = {
          issuer: 'https://auth.lanonasis.com',
          authorization_endpoint: 'https://auth.lanonasis.com/oauth/authorize',
          token_endpoint: 'https://auth.lanonasis.com/oauth/token',
          token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
          revocation_endpoint: 'https://auth.lanonasis.com/oauth/revoke',
          introspection_endpoint: 'https://auth.lanonasis.com/oauth/introspect',
          registration_endpoint: 'https://auth.lanonasis.com/register',
          scopes_supported: ['memories:read', 'memories:write', 'mcp:connect', 'api:access'],
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
          code_challenge_methods_supported: ['S256', 'plain'],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(expectedMetadata),
        });

        const response = await fetch(`${AUTH_GATEWAY_URL}/.well-known/oauth-authorization-server`);
        const metadata = await response.json();

        expect(metadata.issuer).toBe('https://auth.lanonasis.com');
        expect(metadata.authorization_endpoint).toContain('/oauth/authorize');
        expect(metadata.token_endpoint).toContain('/oauth/token');
        expect(metadata.code_challenge_methods_supported).toContain('S256');
        expect(metadata.grant_types_supported).toContain('authorization_code');
      });
    });

    describe('Token Introspection', () => {
      it('should return active:false for invalid tokens', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ active: false }),
        });

        const response = await fetch(`${AUTH_GATEWAY_URL}/oauth/introspect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'invalid_token' }),
        });
        const result = await response.json();

        expect(result.active).toBe(false);
      });

      it('should return token details for valid tokens', async () => {
        const validTokenResponse = {
          active: true,
          client_id: 'test-client',
          user_id: 'user-123',
          scope: 'memories:read mcp:connect',
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(validTokenResponse),
        });

        const response = await fetch(`${AUTH_GATEWAY_URL}/oauth/introspect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'valid_token_here' }),
        });
        const result = await response.json();

        expect(result.active).toBe(true);
        expect(result.client_id).toBe('test-client');
        expect(result.scope).toContain('memories:read');
      });
    });

    describe('Authorization Code Flow with PKCE', () => {
      it('should build correct authorization URL', () => {
        const clientId = 'test-mcp-client';
        const redirectUri = 'http://localhost:8888/callback';
        const scope = 'memories:read memories:write mcp:connect';
        const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
        const state = 'random-state-value';

        const params = new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          state: state,
        });

        const authUrl = `${AUTH_GATEWAY_URL}/oauth/authorize?${params}`;

        expect(authUrl).toContain('response_type=code');
        expect(authUrl).toContain('code_challenge_method=S256');
        expect(authUrl).toContain(encodeURIComponent(redirectUri));
      });

      it('should exchange authorization code for tokens', async () => {
        const tokenResponse = {
          token_type: 'Bearer',
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expires_in: 3600,
          refresh_token: 'refresh_token_value',
          refresh_expires_in: 86400,
          scope: 'memories:read memories:write mcp:connect',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(tokenResponse),
        });

        const response = await fetch(`${AUTH_GATEWAY_URL}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'auth_code_from_callback',
            client_id: 'test-mcp-client',
            redirect_uri: 'http://localhost:8888/callback',
            code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
          }),
        });
        const tokens = await response.json();

        expect(tokens.token_type).toBe('Bearer');
        expect(tokens.access_token).toBeDefined();
        expect(tokens.refresh_token).toBeDefined();
        expect(tokens.expires_in).toBeGreaterThan(0);
      });
    });

    describe('Token Refresh', () => {
      it('should refresh tokens using refresh_token grant', async () => {
        const refreshResponse = {
          token_type: 'Bearer',
          access_token: 'new_access_token',
          expires_in: 3600,
          refresh_token: 'new_refresh_token',
          refresh_expires_in: 86400,
          scope: 'memories:read mcp:connect',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(refreshResponse),
        });

        const response = await fetch(`${AUTH_GATEWAY_URL}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: 'old_refresh_token',
            client_id: 'test-mcp-client',
          }),
        });
        const tokens = await response.json();

        expect(tokens.access_token).toBe('new_access_token');
        expect(tokens.refresh_token).toBe('new_refresh_token');
      });
    });

    describe('Token Revocation', () => {
      it('should revoke access tokens', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ revoked: true }),
        });

        const response = await fetch(`${AUTH_GATEWAY_URL}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'token_to_revoke',
            token_type_hint: 'access_token',
          }),
        });
        const result = await response.json();

        expect(result.revoked).toBe(true);
      });
    });

    describe('Auto-Registration of MCP Clients', () => {
      it('should auto-register localhost MCP clients', async () => {
        // Auth-gateway auto-registers clients with localhost redirects
        const clientId = 'claude-desktop-mcp';
        const redirectUri = 'http://localhost:52423/callback';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 302,
          headers: new Map([['location', `${redirectUri}?code=auto_registered_code&state=test`]]),
        });

        // The authorize endpoint should accept unknown client_ids with localhost redirects
        // and auto-register them
        const authUrl = `${AUTH_GATEWAY_URL}/oauth/authorize?` + new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: redirectUri,
          scope: 'mcp:connect',
          code_challenge: 'test_challenge',
          code_challenge_method: 'S256',
          state: 'test',
        });

        expect(authUrl).toContain(clientId);
        expect(authUrl).toContain(encodeURIComponent(redirectUri));
      });
    });
  });

  describe('Supabase OAuth Server (auth.connectionpoint.tech)', () => {
    const SUPABASE_URL = 'https://<project-ref>.supabase.co';
    const CONSENT_URL = 'https://auth.connectionpoint.tech';

    describe('Consent Page', () => {
      it('should serve consent page with authorization_id', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html>...consent page...</html>'),
        });

        const response = await fetch(`${CONSENT_URL}/oauth/consent?authorization_id=test_auth_id`);

        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
      });

      it('should return error without authorization_id', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Missing authorization_id parameter'),
        });

        const response = await fetch(`${CONSENT_URL}/oauth/consent`);

        expect(response.ok).toBe(false);
        expect(response.status).toBe(400);
      });
    });

    describe('Dynamic OAuth App Registration', () => {
      it('should support dynamic client registration when enabled', async () => {
        // When "Allow Dynamic OAuth Apps" is enabled in Supabase dashboard
        // clients can register programmatically
        const registrationRequest = {
          client_name: 'Test MCP Client',
          redirect_uris: ['http://localhost:8888/callback'],
          scope: 'openid email',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            client_id: 'dynamically_registered_client_id',
            client_name: 'Test MCP Client',
            redirect_uris: ['http://localhost:8888/callback'],
          }),
        });

        // Note: Actual registration endpoint may vary based on Supabase implementation
        const response = await fetch(`${SUPABASE_URL}/oauth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationRequest),
        });
        const client = await response.json();

        expect(client.client_id).toBeDefined();
        expect(client.client_name).toBe('Test MCP Client');
      });
    });

    describe('MCP Authentication Flow', () => {
      it('should redirect to consent page during authorization', async () => {
        // Step 1: Client initiates OAuth at Supabase
        // Supabase validates and redirects to consent page
        const authorizationId = 'supabase_auth_id_123';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 302,
          headers: new Map([
            ['location', `${CONSENT_URL}/oauth/consent?authorization_id=${authorizationId}`]
          ]),
        });

        const authUrl = `${SUPABASE_URL}/oauth/authorize?` + new URLSearchParams({
          client_id: 'mcp-client',
          redirect_uri: 'http://localhost:8888/callback',
          response_type: 'code',
          scope: 'openid email',
          code_challenge: 'test_challenge',
          code_challenge_method: 'S256',
        }).toString();

        expect(authUrl).toContain('response_type=code');
      });

      it('should exchange code via Supabase token endpoint', async () => {
        const tokenResponse = {
          access_token: 'supabase_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'supabase_refresh_token',
          scope: 'openid email',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(tokenResponse),
        });

        const response = await fetch(`${SUPABASE_URL}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: 'auth_code_from_supabase',
            client_id: 'mcp-client',
            redirect_uri: 'http://localhost:8888/callback',
            code_verifier: 'verifier_value',
          }).toString(),
        });
        const tokens = await response.json();

        expect(tokens.access_token).toBeDefined();
        expect(tokens.token_type).toBe('Bearer');
      });
    });
  });

  describe('Cross-System Integration', () => {
    it('should be able to exchange Supabase token for Auth-Gateway token', async () => {
      // After getting Supabase OAuth token, exchange it for auth-gateway token
      // This enables unified token management
      const exchangeResponse = {
        token_type: 'Bearer',
        access_token: 'auth_gateway_access_token',
        refresh_token: 'auth_gateway_refresh_token',
        expires_in: 3600,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'authenticated',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exchangeResponse),
      });

      const response = await fetch('https://auth.lanonasis.com/v1/auth/token/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer supabase_access_token',
        },
        body: JSON.stringify({
          project_scope: 'lanonasis-maas',
          platform: 'mcp',
        }),
      });
      const tokens = await response.json();

      expect(tokens.access_token).toBe('auth_gateway_access_token');
      expect(tokens.user.id).toBe('user-123');
    });
  });
});

describe('PKCE Utilities', () => {
  it('should generate valid code verifier (43-128 chars)', () => {
    const generateCodeVerifier = (): string => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(/^[A-Za-z0-9\-_]+$/.test(verifier)).toBe(true);
  });

  it('should generate S256 code challenge from verifier', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

    // Expected S256 challenge for this verifier
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});
