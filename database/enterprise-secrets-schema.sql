-- Enterprise Secret Management Database Schema
-- Supabase PostgreSQL with pgvector and RLS

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Main secrets table with enterprise features
CREATE TABLE IF NOT EXISTS enterprise_secrets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'api_key', 'database', 'oauth', 'certificate', 
        'ssh_key', 'webhook', 'encryption_key'
    )),
    encrypted_value TEXT NOT NULL,
    key_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Metadata as JSONB for flexibility
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Permissions array for RBAC
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Search and organization
    tags TEXT[] DEFAULT '{}',
    environment TEXT DEFAULT 'production',
    organization_id UUID,
    project_id UUID,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT unique_secret_name_per_user UNIQUE (name, user_id, environment),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'array')
);

-- Index for performance
CREATE INDEX idx_secrets_user_id ON enterprise_secrets(user_id);
CREATE INDEX idx_secrets_type ON enterprise_secrets(type);
CREATE INDEX idx_secrets_environment ON enterprise_secrets(environment);
CREATE INDEX idx_secrets_tags ON enterprise_secrets USING GIN(tags);
CREATE INDEX idx_secrets_expires_at ON enterprise_secrets(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_secrets_metadata ON enterprise_secrets USING GIN(metadata);
CREATE INDEX idx_secrets_name_search ON enterprise_secrets USING btree(lower(name));

-- =====================================================
-- VERSION HISTORY
-- =====================================================

-- Secret version history for audit and rollback
CREATE TABLE IF NOT EXISTS secret_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    secret_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    encrypted_value TEXT NOT NULL,
    key_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by UUID REFERENCES auth.users(id),
    reason TEXT,
    
    -- Link to parent secret
    CONSTRAINT fk_secret_version 
        FOREIGN KEY (secret_id) 
        REFERENCES enterprise_secrets(id) 
        ON DELETE CASCADE,
    
    -- Ensure unique versions per secret
    CONSTRAINT unique_secret_version UNIQUE (secret_id, version)
);

CREATE INDEX idx_versions_secret_id ON secret_versions(secret_id);
CREATE INDEX idx_versions_archived_at ON secret_versions(archived_at);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

-- Immutable audit log for compliance
CREATE TABLE IF NOT EXISTS secret_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    secret_id TEXT,
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'CREATE', 'READ', 'UPDATE', 'DELETE', 
        'ROTATE', 'SHARE', 'REVOKE', 'EXPORT'
    )),
    ip_address INET,
    user_agent TEXT,
    result TEXT CHECK (result IN ('success', 'failure')),
    details JSONB DEFAULT '{}'::jsonb,
    
    -- HMAC signature for tamper detection
    signature TEXT NOT NULL,
    
    -- Timestamp (immutable)
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Prevent updates to audit logs
    CONSTRAINT no_update_audit CHECK (false) NO INHERIT
);

-- Only allow inserts, no updates or deletes
CREATE RULE prevent_audit_update AS ON UPDATE TO secret_audit_logs DO INSTEAD NOTHING;
CREATE RULE prevent_audit_delete AS ON DELETE TO secret_audit_logs DO INSTEAD NOTHING;

CREATE INDEX idx_audit_secret_id ON secret_audit_logs(secret_id);
CREATE INDEX idx_audit_user_id ON secret_audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON secret_audit_logs(timestamp);
CREATE INDEX idx_audit_action ON secret_audit_logs(action);

-- =====================================================
-- ACCESS CONTROL
-- =====================================================

-- Service accounts for programmatic access
CREATE TABLE IF NOT EXISTS service_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    api_key_hash TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT unique_service_account_name UNIQUE (name)
);

CREATE INDEX idx_service_accounts_api_key ON service_accounts(api_key_hash);
CREATE INDEX idx_service_accounts_active ON service_accounts(is_active);

-- Role-based access control
CREATE TABLE IF NOT EXISTS secret_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- User-role mappings
CREATE TABLE IF NOT EXISTS secret_user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES secret_roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ,
    
    PRIMARY KEY (user_id, role_id)
);

-- =====================================================
-- SHARING & COLLABORATION
-- =====================================================

-- Secret sharing with other users
CREATE TABLE IF NOT EXISTS secret_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    secret_id TEXT REFERENCES enterprise_secrets(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_by_user_id UUID REFERENCES auth.users(id),
    
    -- Permissions granted
    permissions TEXT[] DEFAULT ARRAY['read'],
    
    -- Time constraints
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Access tracking
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    CONSTRAINT unique_share UNIQUE (secret_id, shared_with_user_id)
);

CREATE INDEX idx_shares_secret_id ON secret_shares(secret_id);
CREATE INDEX idx_shares_user_id ON secret_shares(shared_with_user_id);
CREATE INDEX idx_shares_expires_at ON secret_shares(expires_at);

-- =====================================================
-- ROTATION POLICIES
-- =====================================================

-- Automatic rotation policies
CREATE TABLE IF NOT EXISTS secret_rotation_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    secret_id TEXT REFERENCES enterprise_secrets(id) ON DELETE CASCADE,
    
    -- Rotation configuration
    interval_days INTEGER NOT NULL DEFAULT 90,
    last_rotated_at TIMESTAMPTZ,
    next_rotation_at TIMESTAMPTZ,
    
    -- Auto-generation settings
    auto_generate BOOLEAN DEFAULT false,
    generation_template JSONB,
    
    -- Notification settings
    notify_days_before INTEGER DEFAULT 7,
    notify_emails TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_policy_per_secret UNIQUE (secret_id)
);

CREATE INDEX idx_rotation_next ON secret_rotation_policies(next_rotation_at) 
    WHERE is_active = true;

-- =====================================================
-- MFA REQUIREMENTS
-- =====================================================

-- MFA requirements for sensitive secrets
CREATE TABLE IF NOT EXISTS secret_mfa_requirements (
    secret_id TEXT REFERENCES enterprise_secrets(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN ('read', 'update', 'delete', 'rotate', 'share')),
    requires_mfa BOOLEAN DEFAULT true,
    mfa_type TEXT CHECK (mfa_type IN ('totp', 'sms', 'email', 'hardware')),
    
    PRIMARY KEY (secret_id, action)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE enterprise_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_rotation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_mfa_requirements ENABLE ROW LEVEL SECURITY;

-- Secrets policies
CREATE POLICY "Users can view their own secrets"
    ON enterprise_secrets FOR SELECT
    USING (user_id = auth.uid() OR 
           EXISTS (
               SELECT 1 FROM secret_shares 
               WHERE secret_id = enterprise_secrets.id 
               AND shared_with_user_id = auth.uid()
               AND (expires_at IS NULL OR expires_at > NOW())
           ));

CREATE POLICY "Users can create their own secrets"
    ON enterprise_secrets FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own secrets"
    ON enterprise_secrets FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own secrets"
    ON enterprise_secrets FOR DELETE
    USING (user_id = auth.uid());

-- Audit log policies (read-only for users)
CREATE POLICY "Users can view audit logs for their secrets"
    ON secret_audit_logs FOR SELECT
    USING (user_id = auth.uid() OR 
           EXISTS (
               SELECT 1 FROM enterprise_secrets 
               WHERE id = secret_audit_logs.secret_id 
               AND user_id = auth.uid()
           ));

-- Version history policies
CREATE POLICY "Users can view versions of their secrets"
    ON secret_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM enterprise_secrets 
        WHERE id = secret_versions.secret_id 
        AND user_id = auth.uid()
    ));

-- Sharing policies
CREATE POLICY "Users can view shares for their secrets"
    ON secret_shares FOR SELECT
    USING (shared_with_user_id = auth.uid() OR
           EXISTS (
               SELECT 1 FROM enterprise_secrets 
               WHERE id = secret_shares.secret_id 
               AND user_id = auth.uid()
           ));

CREATE POLICY "Users can create shares for their secrets"
    ON secret_shares FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM enterprise_secrets 
        WHERE id = secret_shares.secret_id 
        AND user_id = auth.uid()
    ));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to main table
CREATE TRIGGER update_secrets_updated_at 
    BEFORE UPDATE ON enterprise_secrets
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check secret expiration
CREATE OR REPLACE FUNCTION check_secret_expiration()
RETURNS void AS $$
BEGIN
    -- Mark expired secrets
    UPDATE enterprise_secrets
    SET metadata = jsonb_set(metadata, '{expired}', 'true')
    WHERE expires_at < NOW()
    AND (metadata->>'expired')::boolean IS NOT true;
END;
$$ language 'plpgsql';

-- Function to calculate next rotation date
CREATE OR REPLACE FUNCTION calculate_next_rotation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_rotated_at IS NOT NULL THEN
        NEW.next_rotation_at = NEW.last_rotated_at + (NEW.interval_days || ' days')::interval;
    ELSE
        NEW.next_rotation_at = NOW() + (NEW.interval_days || ' days')::interval;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply rotation calculation trigger
CREATE TRIGGER calculate_rotation_date
    BEFORE INSERT OR UPDATE ON secret_rotation_policies
    FOR EACH ROW
    EXECUTE FUNCTION calculate_next_rotation();

-- =====================================================
-- SEED DATA (Roles and Permissions)
-- =====================================================

-- Insert default roles
INSERT INTO secret_roles (name, description, permissions) VALUES
    ('admin', 'Full access to all secret operations', 
     '["create", "read", "update", "delete", "rotate", "share", "audit"]'::jsonb),
    ('developer', 'Standard developer access', 
     '["create", "read", "update", "rotate"]'::jsonb),
    ('viewer', 'Read-only access', 
     '["read"]'::jsonb),
    ('operator', 'Operations team access', 
     '["read", "rotate", "audit"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- VIEWS
-- =====================================================

-- View for active secrets with computed fields
CREATE OR REPLACE VIEW active_secrets AS
SELECT 
    s.*,
    CASE 
        WHEN s.expires_at < NOW() THEN 'expired'
        WHEN s.expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'active'
    END as status,
    rp.next_rotation_at,
    CASE
        WHEN rp.next_rotation_at < NOW() THEN true
        ELSE false
    END as needs_rotation
FROM enterprise_secrets s
LEFT JOIN secret_rotation_policies rp ON s.id = rp.secret_id
WHERE s.expires_at IS NULL OR s.expires_at > NOW();

-- View for audit summary
CREATE OR REPLACE VIEW audit_summary AS
SELECT 
    date_trunc('day', timestamp) as date,
    action,
    result,
    COUNT(*) as count
FROM secret_audit_logs
GROUP BY date_trunc('day', timestamp), action, result
ORDER BY date DESC;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_secrets_user_env_type ON enterprise_secrets(user_id, environment, type);
CREATE INDEX idx_audit_composite ON secret_audit_logs(secret_id, user_id, timestamp DESC);
CREATE INDEX idx_shares_active ON secret_shares(shared_with_user_id, expires_at) 
    WHERE expires_at IS NULL OR expires_at > NOW();

-- =====================================================
-- GRANTS (Adjust based on your Supabase setup)
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON enterprise_secrets TO authenticated;
GRANT SELECT ON secret_versions TO authenticated;
GRANT SELECT, INSERT ON secret_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON secret_shares TO authenticated;
GRANT SELECT ON secret_roles TO authenticated;
GRANT SELECT ON secret_user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON secret_rotation_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON secret_mfa_requirements TO authenticated;

-- Service role gets full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
