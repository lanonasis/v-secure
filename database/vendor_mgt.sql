-- Onasis-CORE Vendor Management Schema
-- Comprehensive vendor authentication, billing, and RLS setup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vendor Organizations Table
CREATE TABLE vendor_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code VARCHAR(20) UNIQUE NOT NULL, -- Unique identifier like 'SFTC_001'
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(50) NOT NULL CHECK (organization_type IN (
        'enterprise', 'startup', 'individual', 'agency', 'reseller'
    )),
    contact_email VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    website_url VARCHAR(500),
    business_registration VARCHAR(100),
    tax_id VARCHAR(50),
    billing_address JSONB,
    
    -- Platform access permissions
    platform_access JSONB DEFAULT '[]'::jsonb, -- ['saas.seftec.tech', 'vortexcore.app']
    service_permissions JSONB DEFAULT '{}'::jsonb, -- {'ai-chat': true, 'embeddings': false}
    
    -- Billing configuration
    billing_tier VARCHAR(50) DEFAULT 'starter' CHECK (billing_tier IN (
        'free', 'starter', 'professional', 'enterprise', 'custom'
    )),
    billing_model VARCHAR(50) DEFAULT 'usage_based' CHECK (billing_model IN (
        'subscription', 'usage_based', 'token_consumption', 'compute_hours', 'hybrid'
    )),
    monthly_limit INTEGER DEFAULT 10000, -- API calls per month
    rate_limit_per_minute INTEGER DEFAULT 100,
    
    -- Financial settings
    credit_balance DECIMAL(10,2) DEFAULT 0.00,
    monthly_spend_limit DECIMAL(10,2) DEFAULT 1000.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status and metadata
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'pending', 'active', 'suspended', 'terminated', 'trial'
    )),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- Compliance and security
    data_retention_days INTEGER DEFAULT 90,
    privacy_level VARCHAR(20) DEFAULT 'high' CHECK (privacy_level IN (
        'standard', 'high', 'maximum'
    )),
    compliance_requirements JSONB DEFAULT '[]'::jsonb -- ['GDPR', 'HIPAA', 'SOC2']
);

-- Vendor API Keys Table
CREATE TABLE vendor_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id) ON DELETE CASCADE,
    
    -- API Key details
    key_id VARCHAR(50) UNIQUE NOT NULL, -- Public identifier like 'pk_live_sftc_001_abc123'
    key_secret_hash VARCHAR(255) NOT NULL, -- Hashed secret key
    key_name VARCHAR(100) NOT NULL DEFAULT 'Default API Key',
    key_description TEXT,
    
    -- Key configuration
    key_type VARCHAR(20) DEFAULT 'standard' CHECK (key_type IN (
        'test', 'live', 'restricted', 'admin'
    )),
    environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN (
        'development', 'staging', 'production'
    )),
    
    -- Permissions and restrictions
    allowed_platforms JSONB DEFAULT '[]'::jsonb,
    allowed_services JSONB DEFAULT '[]'::jsonb,
    allowed_ip_ranges JSONB DEFAULT '[]'::jsonb,
    rate_limit_override INTEGER, -- Override org rate limit
    
    -- Security settings
    requires_signature BOOLEAN DEFAULT false,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    
    -- Status and lifecycle
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Usage tracking
    total_requests INTEGER DEFAULT 0,
    monthly_requests INTEGER DEFAULT 0,
    last_request_at TIMESTAMP WITH TIME ZONE
);

-- Vendor Usage Logs Table (for billing and analytics)
CREATE TABLE vendor_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id),
    api_key_id UUID REFERENCES vendor_api_keys(id),
    
    -- Request details
    request_id VARCHAR(100) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    service VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    
    -- Usage metrics
    request_size_bytes INTEGER DEFAULT 0,
    response_size_bytes INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    tokens_consumed INTEGER DEFAULT 0,
    compute_units DECIMAL(10,4) DEFAULT 0,
    
    -- Billing information
    cost_amount DECIMAL(10,6) DEFAULT 0,
    cost_currency VARCHAR(3) DEFAULT 'USD',
    billing_tier VARCHAR(50),
    
    -- Status and metadata
    status_code INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    user_agent VARCHAR(500),
    ip_address INET,
    
    -- Timestamps
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional context
    request_metadata JSONB DEFAULT '{}'::jsonb,
    response_metadata JSONB DEFAULT '{}'::jsonb
);

-- Vendor Billing Records Table
CREATE TABLE vendor_billing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id),
    
    -- Billing period
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Usage summary
    total_requests INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_compute_hours DECIMAL(10,4) DEFAULT 0,
    
    -- Cost breakdown
    base_cost DECIMAL(10,2) DEFAULT 0,
    usage_cost DECIMAL(10,2) DEFAULT 0,
    overage_cost DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment information
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded', 'disputed'
    )),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE,
    invoice_url VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Platform Sessions Table (for multi-platform SSO)
CREATE TABLE vendor_platform_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_org_id UUID NOT NULL REFERENCES vendor_organizations(id),
    user_id UUID, -- Optional link to specific user within org
    
    -- Session details
    session_token VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent VARCHAR(500),
    
    -- Session lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Security
    requires_mfa BOOLEAN DEFAULT false,
    mfa_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    session_metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_vendor_organizations_vendor_code ON vendor_organizations(vendor_code);
CREATE INDEX idx_vendor_organizations_status ON vendor_organizations(status);
CREATE INDEX idx_vendor_api_keys_vendor_org_id ON vendor_api_keys(vendor_org_id);
CREATE INDEX idx_vendor_api_keys_key_id ON vendor_api_keys(key_id);
CREATE INDEX idx_vendor_api_keys_active ON vendor_api_keys(is_active);
CREATE INDEX idx_vendor_usage_logs_vendor_org_id ON vendor_usage_logs(vendor_org_id);
CREATE INDEX idx_vendor_usage_logs_platform_service ON vendor_usage_logs(platform, service);
CREATE INDEX idx_vendor_usage_logs_timestamp ON vendor_usage_logs(request_timestamp);
CREATE INDEX idx_vendor_billing_records_vendor_org_id ON vendor_billing_records(vendor_org_id);
CREATE INDEX idx_vendor_billing_records_period ON vendor_billing_records(billing_period_start, billing_period_end);
CREATE INDEX idx_vendor_platform_sessions_vendor_org_id ON vendor_platform_sessions(vendor_org_id);
CREATE INDEX idx_vendor_platform_sessions_platform ON vendor_platform_sessions(platform);
CREATE INDEX idx_vendor_platform_sessions_active ON vendor_platform_sessions(is_active);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE vendor_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_platform_sessions ENABLE ROW LEVEL SECURITY;

-- Vendor Organizations RLS Policies
CREATE POLICY "Vendors can view their own organization" ON vendor_organizations
    FOR SELECT USING (
        id = (current_setting('app.vendor_org_id'))::UUID OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Vendors can update their own organization" ON vendor_organizations
    FOR UPDATE USING (
        id = (current_setting('app.vendor_org_id'))::UUID
    );

-- Vendor API Keys RLS Policies
CREATE POLICY "Vendors can manage their own API keys" ON vendor_api_keys
    FOR ALL USING (
        vendor_org_id = (current_setting('app.vendor_org_id'))::UUID OR
        auth.role() = 'service_role'
    );

-- Vendor Usage Logs RLS Policies
CREATE POLICY "Vendors can view their own usage logs" ON vendor_usage_logs
    FOR SELECT USING (
        vendor_org_id = (current_setting('app.vendor_org_id'))::UUID OR
        auth.role() = 'service_role'
    );

CREATE POLICY "System can insert usage logs" ON vendor_usage_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Vendor Billing Records RLS Policies
CREATE POLICY "Vendors can view their own billing records" ON vendor_billing_records
    FOR SELECT USING (
        vendor_org_id = (current_setting('app.vendor_org_id'))::UUID OR
        auth.role() = 'service_role'
    );

-- Vendor Platform Sessions RLS Policies
CREATE POLICY "Vendors can manage their own sessions" ON vendor_platform_sessions
    FOR ALL USING (
        vendor_org_id = (current_setting('app.vendor_org_id'))::UUID OR
        auth.role() = 'service_role'
    );

-- Functions for vendor management

-- Function to generate API key pairs
CREATE OR REPLACE FUNCTION generate_vendor_api_key(
    p_vendor_org_id UUID,
    p_key_name VARCHAR DEFAULT 'Default API Key',
    p_key_type VARCHAR DEFAULT 'live',
    p_environment VARCHAR DEFAULT 'production'
)
RETURNS TABLE (
    key_id VARCHAR,
    key_secret VARCHAR,
    api_key_record_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_id VARCHAR;
    v_key_secret VARCHAR;
    v_key_secret_hash VARCHAR;
    v_record_id UUID;
    v_vendor_code VARCHAR;
BEGIN
    -- Get vendor code for key prefix
    SELECT vendor_code INTO v_vendor_code 
    FROM vendor_organizations 
    WHERE id = p_vendor_org_id;
    
    IF v_vendor_code IS NULL THEN
        RAISE EXCEPTION 'Vendor organization not found';
    END IF;
    
    -- Generate key ID and secret
    v_key_id := CASE p_key_type
        WHEN 'test' THEN 'pk_test_' || LOWER(v_vendor_code) || '_' || LOWER(encode(gen_random_bytes(8), 'hex'))
        ELSE 'pk_live_' || LOWER(v_vendor_code) || '_' || LOWER(encode(gen_random_bytes(8), 'hex'))
    END;
    
    v_key_secret := 'sk_' || p_key_type || '_' || LOWER(encode(gen_random_bytes(32), 'hex'));
    v_key_secret_hash := crypt(v_key_secret, gen_salt('bf', 12));
    
    -- Insert API key record
    INSERT INTO vendor_api_keys (
        vendor_org_id,
        key_id,
        key_secret_hash,
        key_name,
        key_type,
        environment
    ) VALUES (
        p_vendor_org_id,
        v_key_id,
        v_key_secret_hash,
        p_key_name,
        p_key_type,
        p_environment
    ) RETURNING id INTO v_record_id;
    
    -- Return the key information
    RETURN QUERY SELECT v_key_id, v_key_secret, v_record_id;
END;
$$;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_vendor_api_key(
    p_key_id VARCHAR,
    p_key_secret VARCHAR
)
RETURNS TABLE (
    is_valid BOOLEAN,
    vendor_org_id UUID,
    vendor_code VARCHAR,
    rate_limit INTEGER,
    allowed_platforms JSONB,
    allowed_services JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_record RECORD;
    v_org_record RECORD;
BEGIN
    -- Get API key record
    SELECT ak.*, vo.vendor_code, vo.rate_limit_per_minute, vo.status as org_status
    INTO v_key_record
    FROM vendor_api_keys ak
    JOIN vendor_organizations vo ON ak.vendor_org_id = vo.id
    WHERE ak.key_id = p_key_id AND ak.is_active = true;
    
    -- Check if key exists and is active
    IF v_key_record.id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::INTEGER, NULL::JSONB, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Validate secret
    IF NOT (v_key_record.key_secret_hash = crypt(p_key_secret, v_key_record.key_secret_hash)) THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::INTEGER, NULL::JSONB, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Check if organization is active
    IF v_key_record.org_status != 'active' THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::INTEGER, NULL::JSONB, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Update last used timestamp
    UPDATE vendor_api_keys 
    SET last_used_at = NOW(), 
        total_requests = total_requests + 1
    WHERE id = v_key_record.id;
    
    -- Return validation result
    RETURN QUERY SELECT 
        true,
        v_key_record.vendor_org_id,
        v_key_record.vendor_code,
        COALESCE(v_key_record.rate_limit_override, v_key_record.rate_limit_per_minute),
        v_key_record.allowed_platforms,
        v_key_record.allowed_services;
END;
$$;

-- Function to log vendor usage
CREATE OR REPLACE FUNCTION log_vendor_usage(
    p_vendor_org_id UUID,
    p_api_key_id UUID,
    p_request_id VARCHAR,
    p_platform VARCHAR,
    p_service VARCHAR,
    p_processing_time_ms INTEGER DEFAULT 0,
    p_tokens_consumed INTEGER DEFAULT 0,
    p_status_code INTEGER DEFAULT 200,
    p_success BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_cost_amount DECIMAL(10,6) := 0;
BEGIN
    -- Calculate cost based on usage (simplified)
    v_cost_amount := CASE 
        WHEN p_service = 'ai-chat' THEN p_tokens_consumed * 0.000015
        WHEN p_service = 'embeddings' THEN p_tokens_consumed * 0.0000001
        ELSE 0.001
    END;
    
    -- Insert usage log
    INSERT INTO vendor_usage_logs (
        vendor_org_id,
        api_key_id,
        request_id,
        platform,
        service,
        processing_time_ms,
        tokens_consumed,
        cost_amount,
        status_code,
        success
    ) VALUES (
        p_vendor_org_id,
        p_api_key_id,
        p_request_id,
        p_platform,
        p_service,
        p_processing_time_ms,
        p_tokens_consumed,
        v_cost_amount,
        p_status_code,
        p_success
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to get vendor usage summary
CREATE OR REPLACE FUNCTION get_vendor_usage_summary(
    p_vendor_org_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    total_tokens BIGINT,
    total_cost DECIMAL,
    platform_breakdown JSONB,
    service_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH usage_stats AS (
        SELECT 
            COUNT(*) as req_count,
            COUNT(*) FILTER (WHERE success = true) as success_count,
            COALESCE(SUM(tokens_consumed), 0) as token_sum,
            COALESCE(SUM(cost_amount), 0) as cost_sum,
            platform,
            service
        FROM vendor_usage_logs
        WHERE vendor_org_id = p_vendor_org_id
          AND request_timestamp BETWEEN p_start_date AND p_end_date
        GROUP BY platform, service
    )
    SELECT 
        SUM(req_count)::BIGINT,
        SUM(success_count)::BIGINT,
        SUM(token_sum)::BIGINT,
        SUM(cost_sum)::DECIMAL,
        jsonb_object_agg(platform, req_count) FILTER (WHERE platform IS NOT NULL),
        jsonb_object_agg(service, req_count) FILTER (WHERE service IS NOT NULL)
    FROM usage_stats;
END;
$$;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendor_organizations_updated_at BEFORE UPDATE ON vendor_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_api_keys_updated_at BEFORE UPDATE ON vendor_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_billing_records_updated_at BEFORE UPDATE ON vendor_billing_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample vendor organization
INSERT INTO vendor_organizations (
    vendor_code,
    organization_name,
    organization_type,
    contact_email,
    contact_name,
    platform_access,
    service_permissions,
    billing_tier,
    billing_model
) VALUES (
    'ONASIS_DEMO',
    'Onasis Demo Organization',
    'enterprise',
    'demo@onasis.io',
    'Demo Admin',
    '["saas.seftec.tech", "vortexcore.app", "lanonasis.com"]'::jsonb,
    '{"ai-chat": true, "embeddings": true, "text-to-speech": true}'::jsonb,
    'enterprise',
    'usage_based'
);

COMMENT ON TABLE vendor_organizations IS 'Master table for vendor organizations with unique identifiers and billing configuration';
COMMENT ON TABLE vendor_api_keys IS 'API keys for vendor authentication with granular permissions';
COMMENT ON TABLE vendor_usage_logs IS 'Detailed usage tracking for billing and analytics';
COMMENT ON TABLE vendor_billing_records IS 'Monthly billing records and payment tracking';
COMMENT ON TABLE vendor_platform_sessions IS 'Multi-platform session management for SSO';

COMMENT ON FUNCTION generate_vendor_api_key IS 'Generates secure API key pairs for vendors';
COMMENT ON FUNCTION validate_vendor_api_key IS 'Validates API keys and returns vendor permissions';
COMMENT ON FUNCTION log_vendor_usage IS 'Logs API usage for billing and analytics';
COMMENT ON FUNCTION get_vendor_usage_summary IS 'Returns usage summary for billing calculations';