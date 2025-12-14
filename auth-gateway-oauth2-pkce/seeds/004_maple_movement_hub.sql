-- Seed: Register Maple Movement Hub SPA
-- Purpose: Enable PKCE OAuth for maplehub.lanonasis.com + local dev
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
  'maple-movement-hub',
  'Maple Movement Hub',
  'public',
  TRUE,
  ARRAY['S256']::VARCHAR[],
  '["https://maplehub.lanonasis.com/auth/callback", "https://maple.lanonasis.com/auth/callback", "http://localhost:5173/auth/callback", "http://127.0.0.1:5173/auth/callback", "http://localhost:4173/auth/callback"]'::jsonb,
  ARRAY['memories:read','memories:write','profile','email','maple:read','maple:write']::TEXT[],
  ARRAY['memories:read','profile','maple:read']::TEXT[],
  'active',
  'First-party SPA for Maple Movement Hub (maplehub.lanonasis.com) using PKCE via auth gateway'
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
