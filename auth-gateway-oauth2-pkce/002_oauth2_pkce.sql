--
-- OAuth2 PKCE Implementation for auth-gateway
-- Migration: 002_oauth2_pkce
-- Created: 2025-11-02
-- Purpose: Add OAuth2 Authorization Code with PKCE support for VSCode extensions
--

-- =====================================================
-- 1. OAuth Clients Table
-- =====================================================
-- Stores registered OAuth2 clients (VSCode extensions, CLI tools, etc.)
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) NOT NULL DEFAULT 'public' CHECK (client_type IN ('public', 'confidential')),

    -- PKCE Configuration
    require_pkce BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_code_challenge_methods VARCHAR(10)[] DEFAULT ARRAY['S256']::VARCHAR[],

    -- Redirect URIs (JSON array for flexibility)
    allowed_redirect_uris JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Scopes
    allowed_scopes TEXT[] DEFAULT ARRAY['memories:read', 'memories:write', 'memories:delete']::TEXT[],
    default_scopes TEXT[] DEFAULT ARRAY['memories:read']::TEXT[],

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),

    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- References admin user who registered the client

    -- Indexes
    CONSTRAINT oauth_clients_redirect_uris_check CHECK (jsonb_typeof(allowed_redirect_uris) = 'array')
);

-- Index for fast client lookups
CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_status ON oauth_clients(status);

-- =====================================================
-- 2. OAuth Authorization Codes Table
-- =====================================================
-- Short-lived authorization codes (5-10 minutes TTL)
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Code (hashed for security)
    code_hash VARCHAR(255) UNIQUE NOT NULL,

    -- Client & User
    client_id VARCHAR(100) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References Supabase auth.users(id)

    -- PKCE Challenge
    code_challenge VARCHAR(255) NOT NULL,
    code_challenge_method VARCHAR(10) NOT NULL DEFAULT 'S256' CHECK (code_challenge_method IN ('S256', 'plain')),

    -- OAuth Parameters
    redirect_uri TEXT NOT NULL,
    scope TEXT[] DEFAULT ARRAY[]::TEXT[],
    state VARCHAR(255), -- CSRF protection token from client

    -- Lifecycle
    expires_at TIMESTAMPTZ NOT NULL,
    consumed BOOLEAN DEFAULT FALSE,
    consumed_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Constraints
    CONSTRAINT oauth_codes_expires_check CHECK (expires_at > created_at),
    CONSTRAINT oauth_codes_consumed_check CHECK (
        (consumed = FALSE AND consumed_at IS NULL) OR
        (consumed = TRUE AND consumed_at IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_codes_code_hash ON oauth_authorization_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_client_user ON oauth_authorization_codes(client_id, user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_consumed ON oauth_authorization_codes(consumed);

-- =====================================================
-- 3. OAuth Tokens Table
-- =====================================================
-- Issued access and refresh tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Token (hashed)
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('access', 'refresh')),

    -- Client & User
    client_id VARCHAR(100) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References Supabase auth.users(id)

    -- OAuth Parameters
    scope TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Lifecycle
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,

    -- Refresh token parent (for rotation)
    parent_token_id UUID REFERENCES oauth_tokens(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT oauth_tokens_expires_check CHECK (expires_at > created_at),
    CONSTRAINT oauth_tokens_revoked_check CHECK (
        (revoked = FALSE AND revoked_at IS NULL) OR
        (revoked = TRUE AND revoked_at IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_token_hash ON oauth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_user ON oauth_tokens(client_id, user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_type ON oauth_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_revoked ON oauth_tokens(revoked);

-- =====================================================
-- 4. OAuth Audit Log Table
-- =====================================================
-- Complete audit trail of all OAuth2 operations
CREATE TABLE IF NOT EXISTS oauth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event
    event_type VARCHAR(50) NOT NULL,
    -- Event types: authorize_request, code_issued, token_issued, token_refreshed,
    --              token_revoked, authorization_denied, invalid_request, etc.

    -- Client & User
    client_id VARCHAR(100),
    user_id UUID, -- References Supabase auth.users(id)

    -- Request Details
    ip_address INET,
    user_agent TEXT,

    -- OAuth Parameters
    scope TEXT[],
    redirect_uri TEXT,
    grant_type VARCHAR(50),

    -- Result
    success BOOLEAN NOT NULL,
    error_code VARCHAR(50),
    error_description TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_oauth_audit_event_type ON oauth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_oauth_audit_client ON oauth_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_audit_user ON oauth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_audit_created ON oauth_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_oauth_audit_success ON oauth_audit_log(success);

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Function: Clean up expired authorization codes
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_authorization_codes
    WHERE expires_at < NOW() OR (consumed = TRUE AND consumed_at < NOW() - INTERVAL '1 hour');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_tokens
    WHERE expires_at < NOW() AND revoked = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Update timestamp on oauth_clients
CREATE OR REPLACE FUNCTION update_oauth_clients_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for oauth_clients updated_at
CREATE TRIGGER trigger_oauth_clients_updated_at
    BEFORE UPDATE ON oauth_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_oauth_clients_timestamp();

-- =====================================================
-- 6. Seed Verified Clients
-- =====================================================

-- Cursor/VSCode Extension Client
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
    'cursor-extension',
    'Cursor VSCode Extension',
    'public',
    TRUE,
    ARRAY['S256']::VARCHAR[],
    '["http://localhost:8080/callback", "http://127.0.0.1:8080/callback", "vscode://lanonasis.mcp-client/callback"]'::jsonb,
    ARRAY['memories:read', 'memories:write', 'memories:delete', 'profile']::TEXT[],
    ARRAY['memories:read']::TEXT[],
    'active',
    'Official Cursor/VSCode extension for Lanonasis MCP access'
) ON CONFLICT (client_id) DO UPDATE SET
    client_name = EXCLUDED.client_name,
    allowed_redirect_uris = EXCLUDED.allowed_redirect_uris,
    updated_at = NOW();

-- CLI Client
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
    'onasis-cli',
    'Onasis CLI Tool',
    'public',
    TRUE,
    ARRAY['S256']::VARCHAR[],
    '["http://localhost:3000/callback", "http://127.0.0.1:3000/callback"]'::jsonb,
    ARRAY['memories:read', 'memories:write', 'memories:delete', 'admin']::TEXT[],
    ARRAY['memories:read', 'memories:write']::TEXT[],
    'active',
    'Official Onasis CLI tool for MCP management'
) ON CONFLICT (client_id) DO UPDATE SET
    client_name = EXCLUDED.client_name,
    updated_at = NOW();

-- =====================================================
-- 7. Comments for Documentation
-- =====================================================

COMMENT ON TABLE oauth_clients IS 'Registered OAuth2 clients (VSCode extensions, CLI tools)';
COMMENT ON TABLE oauth_authorization_codes IS 'Short-lived authorization codes for OAuth2 PKCE flow';
COMMENT ON TABLE oauth_tokens IS 'Issued access and refresh tokens';
COMMENT ON TABLE oauth_audit_log IS 'Complete audit trail of OAuth2 operations';

COMMENT ON COLUMN oauth_clients.require_pkce IS 'Enforce PKCE for this client (recommended: TRUE for public clients)';
COMMENT ON COLUMN oauth_authorization_codes.code_challenge IS 'SHA256 hash of code_verifier (PKCE)';
COMMENT ON COLUMN oauth_authorization_codes.consumed IS 'Authorization code can only be used once';
COMMENT ON COLUMN oauth_tokens.parent_token_id IS 'Tracks refresh token rotation chain';

-- =====================================================
-- Migration Complete
-- =====================================================
-- OAuth2 PKCE tables created successfully
-- Verified clients seeded: cursor-extension, onasis-cli
-- Helper functions and triggers installed
-- Ready for auth-gateway OAuth endpoint implementation
