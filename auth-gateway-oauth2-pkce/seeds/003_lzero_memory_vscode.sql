-- Seed: Register VSCode client `lzero-memory-vscode`
-- Purpose: Ensure /oauth/authorize accepts the client_id and redirect URI
-- Safe to re-run: uses ON CONFLICT (client_id) DO UPDATE

INSERT INTO oauth_clients (
  client_id,
  client_name,
  client_type,
  require_pkce,
  allowed_code_challenge_methods,
  allowed_redirect_uris,
  allowed_scopes,
  default_scopes,
  status,
  description
) VALUES (
  'lzero-memory-vscode',
  'LZero Memory VSCode Extension',
  'public',
  TRUE,
  ARRAY['S256']::VARCHAR[],
  '["vscode://lanonasis.lzero-memory/callback"]'::jsonb,
  -- Include both singular and plural variants to avoid invalid_scope in mixed callers
  ARRAY['memory:read','memory:write','memories:read','memories:write','api_keys:manage']::TEXT[],
  ARRAY['memory:read']::TEXT[],
  'active',
  'VS Code extension OAuth client for LZero Memory'
)
ON CONFLICT (client_id) DO UPDATE SET
  client_name = EXCLUDED.client_name,
  require_pkce = EXCLUDED.require_pkce,
  allowed_code_challenge_methods = EXCLUDED.allowed_code_challenge_methods,
  allowed_redirect_uris = EXCLUDED.allowed_redirect_uris,
  allowed_scopes = EXCLUDED.allowed_scopes,
  default_scopes = EXCLUDED.default_scopes,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  updated_at = NOW();
