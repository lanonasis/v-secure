-- API Key Manager Extension for LanOnasis MaaS
-- This extends the existing schema with Vortex API Key Manager functionality

-- Enable additional extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types for API key management
CREATE TYPE api_key_type AS ENUM ('api_key', 'database_url', 'oauth_token', 'certificate', 'ssh_key', 'webhook_secret', 'encryption_key');
CREATE TYPE key_environment AS ENUM ('development', 'staging', 'production');
CREATE TYPE key_status AS ENUM ('active', 'rotating', 'deprecated', 'expired', 'compromised');
CREATE TYPE access_level AS ENUM ('public', 'authenticated', 'team', 'admin', 'enterprise');

-- Projects table for API key organization (extends existing organization concept)
CREATE TABLE IF NOT EXISTS api_key_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_members UUID[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT api_key_projects_name_length CHECK (LENGTH(name) >= 1),
    UNIQUE(organization_id, name)
);

-- Stored API keys table
CREATE TABLE IF NOT EXISTS stored_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    environment key_environment NOT NULL DEFAULT 'development',
    project_id UUID NOT NULL REFERENCES api_key_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encrypted_value TEXT NOT NULL, -- AES encrypted value
    key_type api_key_type NOT NULL DEFAULT 'api_key',
    access_level access_level NOT NULL DEFAULT 'team',
    status key_status NOT NULL DEFAULT 'active',
    tags TEXT[] DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    last_rotated TIMESTAMPTZ DEFAULT NOW(),
    rotation_frequency INTEGER DEFAULT 90, -- days
    expires_at TIMESTAMPTZ, -- optional expiration
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT stored_api_keys_name_length CHECK (LENGTH(name) >= 1),
    CONSTRAINT stored_api_keys_usage_count_positive CHECK (usage_count >= 0),
    UNIQUE(project_id, name, environment)
);

-- Key rotation policies
CREATE TABLE IF NOT EXISTS key_rotation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID NOT NULL REFERENCES stored_api_keys(id) ON DELETE CASCADE,
    frequency_days INTEGER NOT NULL DEFAULT 90,
    overlap_hours INTEGER NOT NULL DEFAULT 24,
    auto_rotate BOOLEAN DEFAULT false,
    notification_webhooks TEXT[] DEFAULT '{}',
    next_rotation TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MCP tools for secure key access
CREATE TABLE IF NOT EXISTS mcp_key_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id VARCHAR(255) UNIQUE NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL, -- {keys: [], environments: [], maxConcurrentSessions: 3, maxSessionDuration: 900}
    webhook_url TEXT,
    auto_approve BOOLEAN DEFAULT false,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'pending_approval')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MCP access requests for keys
CREATE TABLE IF NOT EXISTS mcp_key_access_requests (
    id VARCHAR(255) PRIMARY KEY, -- req_timestamp_random
    tool_id VARCHAR(255) NOT NULL REFERENCES mcp_key_tools(tool_id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_names TEXT[] NOT NULL,
    environment key_environment NOT NULL,
    justification TEXT NOT NULL,
    estimated_duration INTEGER NOT NULL, -- seconds
    requires_approval BOOLEAN DEFAULT false,
    context JSONB NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'denied', 'expired')) DEFAULT 'pending',
    approver_notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Active MCP sessions for key access
CREATE TABLE IF NOT EXISTS mcp_key_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL REFERENCES mcp_key_access_requests(id),
    tool_id VARCHAR(255) NOT NULL REFERENCES mcp_key_tools(tool_id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_names TEXT[] NOT NULL,
    environment key_environment NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Temporary proxy tokens for secure key access
CREATE TABLE IF NOT EXISTS mcp_proxy_tokens (
    token_id VARCHAR(255) PRIMARY KEY,
    proxy_value VARCHAR(500) UNIQUE NOT NULL, -- temporary proxy token
    encrypted_mapping TEXT NOT NULL, -- contains actual key value and metadata
    key_id UUID NOT NULL REFERENCES stored_api_keys(id),
    tool_id VARCHAR(255) NOT NULL REFERENCES mcp_key_tools(tool_id),
    session_id VARCHAR(255) NOT NULL REFERENCES mcp_key_sessions(session_id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Key usage analytics
CREATE TABLE IF NOT EXISTS key_usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID NOT NULL REFERENCES stored_api_keys(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tool_id VARCHAR(255) REFERENCES mcp_key_tools(tool_id),
    session_id VARCHAR(255) REFERENCES mcp_key_sessions(session_id),
    operation VARCHAR(50) NOT NULL, -- 'access', 'rotate', 'create', 'update', 'delete'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security events for API keys
CREATE TABLE IF NOT EXISTS key_security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id UUID REFERENCES stored_api_keys(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) CHECK (event_type IN ('unauthorized_access', 'failed_rotation', 'anomaly_detected', 'compliance_violation', 'suspicious_usage')) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MCP audit log for key operations
CREATE TABLE IF NOT EXISTS mcp_key_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    tool_id VARCHAR(255) REFERENCES mcp_key_tools(tool_id),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    key_id UUID REFERENCES stored_api_keys(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_key_projects_organization_id ON api_key_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_key_projects_owner_id ON api_key_projects(owner_id);

CREATE INDEX IF NOT EXISTS idx_stored_api_keys_project_id ON stored_api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_stored_api_keys_organization_id ON stored_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_stored_api_keys_status ON stored_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_stored_api_keys_environment ON stored_api_keys(environment);
CREATE INDEX IF NOT EXISTS idx_stored_api_keys_name_project ON stored_api_keys(name, project_id);
CREATE INDEX IF NOT EXISTS idx_stored_api_keys_tags ON stored_api_keys USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_key_rotation_policies_key_id ON key_rotation_policies(key_id);
CREATE INDEX IF NOT EXISTS idx_key_rotation_policies_next_rotation ON key_rotation_policies(next_rotation);

CREATE INDEX IF NOT EXISTS idx_mcp_key_tools_organization_id ON mcp_key_tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_key_tools_tool_id ON mcp_key_tools(tool_id);

CREATE INDEX IF NOT EXISTS idx_mcp_key_sessions_organization_id ON mcp_key_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_key_sessions_expires_at ON mcp_key_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_mcp_key_sessions_tool_id ON mcp_key_sessions(tool_id);

CREATE INDEX IF NOT EXISTS idx_mcp_proxy_tokens_organization_id ON mcp_proxy_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_proxy_tokens_proxy_value ON mcp_proxy_tokens(proxy_value);
CREATE INDEX IF NOT EXISTS idx_mcp_proxy_tokens_expires_at ON mcp_proxy_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_key_usage_analytics_organization_id ON key_usage_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_key_usage_analytics_key_id ON key_usage_analytics(key_id);
CREATE INDEX IF NOT EXISTS idx_key_usage_analytics_timestamp ON key_usage_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_key_usage_analytics_operation ON key_usage_analytics(operation);

CREATE INDEX IF NOT EXISTS idx_key_security_events_organization_id ON key_security_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_key_security_events_severity ON key_security_events(severity);
CREATE INDEX IF NOT EXISTS idx_key_security_events_timestamp ON key_security_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_key_audit_log_organization_id ON mcp_key_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_mcp_key_audit_log_timestamp ON mcp_key_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_key_audit_log_event_type ON mcp_key_audit_log(event_type);

-- Row Level Security
ALTER TABLE api_key_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_rotation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_key_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_key_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_key_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_proxy_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_key_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access projects in their organization" ON api_key_projects
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access keys in their organization" ON stored_api_keys
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access MCP tools in their organization" ON mcp_key_tools
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access sessions in their organization" ON mcp_key_sessions
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can access analytics in their organization" ON key_usage_analytics
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Functions for API key management
CREATE OR REPLACE FUNCTION update_key_next_rotation()
RETURNS TRIGGER AS $$
BEGIN
    NEW.next_rotation = NOW() + (NEW.frequency_days || ' days')::INTERVAL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rotation scheduling
CREATE TRIGGER trigger_update_key_next_rotation
    BEFORE INSERT OR UPDATE ON key_rotation_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_key_next_rotation();

-- Function to increment key usage count
CREATE OR REPLACE FUNCTION increment_key_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.operation = 'access' AND NEW.success = true THEN
        UPDATE stored_api_keys 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.key_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for usage counting
CREATE TRIGGER trigger_increment_key_usage_count
    AFTER INSERT ON key_usage_analytics
    FOR EACH ROW
    EXECUTE FUNCTION increment_key_usage_count();

-- Function to clean up expired sessions and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_key_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- End expired sessions
    UPDATE mcp_key_sessions 
    SET ended_at = NOW()
    WHERE expires_at < NOW() AND ended_at IS NULL;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Revoke expired tokens
    UPDATE mcp_proxy_tokens 
    SET revoked_at = NOW()
    WHERE expires_at < NOW() AND revoked_at IS NULL;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function for secure key retrieval with MCP
CREATE OR REPLACE FUNCTION get_key_for_mcp_session(
    session_id_param VARCHAR(255),
    key_name_param VARCHAR(255)
)
RETURNS TABLE (
    proxy_token VARCHAR(500),
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    session_record RECORD;
    key_record RECORD;
    proxy_token_value VARCHAR(500);
    token_id_value VARCHAR(255);
BEGIN
    -- Verify session is active
    SELECT * INTO session_record
    FROM mcp_key_sessions 
    WHERE session_id = session_id_param 
    AND expires_at > NOW() 
    AND ended_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired session';
    END IF;
    
    -- Get the requested key
    SELECT * INTO key_record
    FROM stored_api_keys 
    WHERE name = key_name_param 
    AND organization_id = session_record.organization_id
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Key not found or inactive';
    END IF;
    
    -- Generate proxy token
    proxy_token_value := 'vortex_proxy_' || encode(gen_random_bytes(32), 'base64');
    token_id_value := 'token_' || encode(gen_random_bytes(16), 'hex');
    
    -- Store proxy token
    INSERT INTO mcp_proxy_tokens (
        token_id, proxy_value, encrypted_mapping, key_id, 
        tool_id, session_id, organization_id, expires_at
    ) VALUES (
        token_id_value, proxy_token_value, key_record.encrypted_value, 
        key_record.id, session_record.tool_id, session_id_param,
        session_record.organization_id, session_record.expires_at
    );
    
    -- Log access
    INSERT INTO key_usage_analytics (
        key_id, organization_id, tool_id, session_id, operation, success
    ) VALUES (
        key_record.id, session_record.organization_id, session_record.tool_id,
        session_id_param, 'access', true
    );
    
    RETURN QUERY SELECT proxy_token_value, session_record.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;