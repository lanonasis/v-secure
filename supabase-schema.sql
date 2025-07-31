-- Vortex Secure - Complete Supabase Database Schema
-- Run this script to set up the complete database structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE TABLES
-- =============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  team_members UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secrets table  
CREATE TABLE IF NOT EXISTS secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')) NOT NULL,
  project_id UUID REFERENCES projects(id) NOT NULL,
  encrypted_value TEXT NOT NULL,
  secret_type TEXT CHECK (secret_type IN ('api_key', 'database_url', 'oauth_token', 'certificate', 'ssh_key', 'webhook_secret', 'encryption_key')) NOT NULL,
  access_level TEXT CHECK (access_level IN ('public', 'authenticated', 'team', 'admin', 'enterprise')) DEFAULT 'team',
  status TEXT CHECK (status IN ('active', 'rotating', 'deprecated', 'expired', 'compromised')) DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_rotated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rotation_frequency INTEGER DEFAULT 90, -- days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rotation policies table
CREATE TABLE IF NOT EXISTS rotation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE,
  frequency_days INTEGER NOT NULL DEFAULT 90,
  overlap_hours INTEGER NOT NULL DEFAULT 24,
  auto_rotate BOOLEAN DEFAULT false,
  notification_webhooks TEXT[] DEFAULT '{}',
  next_rotation TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage metrics table (for analytics)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE,
  operation TEXT CHECK (operation IN ('access', 'rotate', 'create', 'update', 'delete')) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('unauthorized_access', 'failed_rotation', 'anomaly_detected', 'compliance_violation')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MCP INTEGRATION TABLES
-- =============================================

-- MCP tools registration
CREATE TABLE IF NOT EXISTS mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id TEXT UNIQUE NOT NULL,
  tool_name TEXT NOT NULL,
  permissions JSONB NOT NULL, -- {secrets: [], environments: [], maxConcurrentSessions: 3, maxSessionDuration: 900}
  webhook_url TEXT,
  auto_approve BOOLEAN DEFAULT false,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT CHECK (status IN ('active', 'suspended', 'pending_approval')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP access requests
CREATE TABLE IF NOT EXISTS mcp_access_requests (
  id TEXT PRIMARY KEY, -- req_timestamp_random
  tool_id TEXT REFERENCES mcp_tools(tool_id) NOT NULL,
  secret_names TEXT[] NOT NULL,
  justification TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL, -- seconds
  requires_approval BOOLEAN DEFAULT false,
  context JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'expired')) DEFAULT 'pending',
  approver_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active MCP sessions
CREATE TABLE IF NOT EXISTS mcp_active_sessions (
  session_id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES mcp_access_requests(id) NOT NULL,
  tool_id TEXT REFERENCES mcp_tools(tool_id) NOT NULL,
  secret_names TEXT[] NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP proxy tokens
CREATE TABLE IF NOT EXISTS mcp_proxy_tokens (
  token_id TEXT PRIMARY KEY,
  proxy_value TEXT UNIQUE NOT NULL,
  encrypted_mapping TEXT NOT NULL, -- contains actual secret value and metadata
  secret_id UUID REFERENCES secrets(id) NOT NULL,
  tool_id TEXT REFERENCES mcp_tools(tool_id) NOT NULL,
  session_id TEXT REFERENCES mcp_active_sessions(session_id) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCP audit log
CREATE TABLE IF NOT EXISTS mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  tool_id TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VPS MANAGEMENT TABLES
-- =============================================

-- VPS servers
CREATE TABLE IF NOT EXISTS vps_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ip_address INET NOT NULL,
  location TEXT,
  ssh_port INTEGER DEFAULT 22,
  ssh_user TEXT DEFAULT 'root',
  status TEXT CHECK (status IN ('online', 'offline', 'error', 'maintenance')) DEFAULT 'offline',
  ssh_status TEXT CHECK (ssh_status IN ('connected', 'timeout', 'refused', 'unknown')) DEFAULT 'unknown',
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VPS metrics (system stats)
CREATE TABLE IF NOT EXISTS vps_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES vps_servers(id) ON DELETE CASCADE,
  cpu_usage DECIMAL(5,2),
  memory_used DECIMAL(10,2), -- GB
  memory_total DECIMAL(10,2), -- GB
  disk_used DECIMAL(10,2), -- GB
  disk_total DECIMAL(10,2), -- GB
  network_in DECIMAL(10,2), -- MB/s
  network_out DECIMAL(10,2), -- MB/s
  load_average DECIMAL(5,2),
  uptime_seconds BIGINT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VPS services
CREATE TABLE IF NOT EXISTS vps_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES vps_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('running', 'stopped', 'error')) NOT NULL,
  port INTEGER,
  pid INTEGER,
  memory_mb INTEGER,
  restart_count INTEGER DEFAULT 0,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Secrets indexes
CREATE INDEX IF NOT EXISTS idx_secrets_project_id ON secrets(project_id);
CREATE INDEX IF NOT EXISTS idx_secrets_environment ON secrets(environment);
CREATE INDEX IF NOT EXISTS idx_secrets_status ON secrets(status);
CREATE INDEX IF NOT EXISTS idx_secrets_name_project ON secrets(name, project_id);

-- Usage metrics indexes
CREATE INDEX IF NOT EXISTS idx_usage_metrics_secret_id ON usage_metrics(secret_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_timestamp ON usage_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_operation ON usage_metrics(operation);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_secret_id ON security_events(secret_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);

-- MCP indexes
CREATE INDEX IF NOT EXISTS idx_mcp_tools_tool_id ON mcp_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_tool_id ON mcp_active_sessions(tool_id);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_expires ON mcp_active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_proxy_value ON mcp_proxy_tokens(proxy_value);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_expires ON mcp_proxy_tokens(expires_at);

-- VPS indexes
CREATE INDEX IF NOT EXISTS idx_vps_metrics_server_timestamp ON vps_metrics(server_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_vps_services_server_id ON vps_services(server_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_proxy_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vps_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vps_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE vps_services ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can only see their own projects" ON projects
  FOR ALL USING (auth.uid() = owner_id OR auth.uid() = ANY(team_members));

-- Secrets policies  
CREATE POLICY "Users can only see secrets from their projects" ON secrets
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE owner_id = auth.uid() OR auth.uid() = ANY(team_members)
    )
  );

-- Rotation policies
CREATE POLICY "Users can only see rotation policies for their secrets" ON rotation_policies
  FOR ALL USING (
    secret_id IN (
      SELECT s.id FROM secrets s
      JOIN projects p ON s.project_id = p.id
      WHERE p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members)
    )
  );

-- Usage metrics
CREATE POLICY "Users can only see usage metrics for their secrets" ON usage_metrics
  FOR ALL USING (
    secret_id IN (
      SELECT s.id FROM secrets s
      JOIN projects p ON s.project_id = p.id
      WHERE p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members)
    )
  );

-- MCP tools - users can only see their own tools
CREATE POLICY "Users can only see their own MCP tools" ON mcp_tools
  FOR ALL USING (created_by = auth.uid());

-- VPS servers - users can see all servers (admin access)
CREATE POLICY "Admin users can see all VPS servers" ON vps_servers
  FOR ALL USING (true); -- Adjust based on your admin role system

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update next rotation date
CREATE OR REPLACE FUNCTION update_next_rotation()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_rotation = NOW() + (NEW.frequency_days || ' days')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rotation scheduling
DROP TRIGGER IF EXISTS trigger_update_next_rotation ON rotation_policies;
CREATE TRIGGER trigger_update_next_rotation
  BEFORE INSERT OR UPDATE ON rotation_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_next_rotation();

-- Function to increment secret usage count
CREATE OR REPLACE FUNCTION increment_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.operation = 'access' AND NEW.success = true THEN
    UPDATE secrets 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.secret_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for usage counting
DROP TRIGGER IF EXISTS trigger_increment_usage_count ON usage_metrics;
CREATE TRIGGER trigger_increment_usage_count
  AFTER INSERT ON usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_secrets_updated_at ON secrets;
CREATE TRIGGER trigger_secrets_updated_at
  BEFORE UPDATE ON secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- DEMO DATA
-- =============================================

-- Insert demo project
INSERT INTO projects (id, name, description, owner_id, team_members) 
VALUES (
  'demo-project-uuid', 
  'Demo Project', 
  'Demonstration project for admin.connectionpoint.tech',
  (SELECT id FROM auth.users LIMIT 1),
  ARRAY[]::UUID[]
) ON CONFLICT DO NOTHING;

-- Insert demo secrets
INSERT INTO secrets (name, environment, project_id, encrypted_value, secret_type, tags, usage_count, last_rotated) VALUES
('stripe_api_key', 'production', 'demo-project-uuid', 'encrypted_demo_value_1', 'api_key', ARRAY['payment', 'critical'], 156, NOW() - INTERVAL '10 days'),
('database_url', 'production', 'demo-project-uuid', 'encrypted_demo_value_2', 'database_url', ARRAY['database', 'backend'], 243, NOW() - INTERVAL '45 days'),
('openai_api_key', 'staging', 'demo-project-uuid', 'encrypted_demo_value_3', 'api_key', ARRAY['ai', 'development'], 89, NOW() - INTERVAL '5 days'),
('webhook_secret', 'development', 'demo-project-uuid', 'encrypted_demo_value_4', 'webhook_secret', ARRAY['webhook', 'integration'], 34, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Insert demo MCP tool
INSERT INTO mcp_tools (tool_id, tool_name, permissions, auto_approve, risk_level, created_by) VALUES
('stripe-payment-processor', 'AI Payment Processor', '{"secrets": ["stripe_api_key"], "environments": ["production"], "maxConcurrentSessions": 3, "maxSessionDuration": 600}', false, 'high', (SELECT id FROM auth.users LIMIT 1)),
('database-manager', 'Database Manager AI', '{"secrets": ["database_url"], "environments": ["staging", "production"], "maxConcurrentSessions": 2, "maxSessionDuration": 300}', true, 'medium', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert demo VPS servers
INSERT INTO vps_servers (name, ip_address, location, status, ssh_status) VALUES
('connection-point-main', '45.123.456.789', 'New York, US', 'online', 'timeout'),
('backup-server', '45.123.456.790', 'London, UK', 'online', 'connected')
ON CONFLICT DO NOTHING;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Insert a completion log
INSERT INTO mcp_audit_log (event_type, metadata) VALUES
('schema_setup_complete', '{"version": "1.0.0", "timestamp": "' || NOW() || '"}');

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Vortex Secure database schema setup completed successfully!';
  RAISE NOTICE '📊 Tables created: projects, secrets, rotation_policies, usage_metrics, security_events';
  RAISE NOTICE '🤖 MCP integration tables: mcp_tools, mcp_access_requests, mcp_active_sessions, mcp_proxy_tokens, mcp_audit_log';
  RAISE NOTICE '🖥️ VPS management tables: vps_servers, vps_metrics, vps_services';
  RAISE NOTICE '🔒 Row Level Security enabled for all tables';
  RAISE NOTICE '⚡ Indexes and triggers configured for optimal performance';
  RAISE NOTICE '🎯 Demo data inserted for testing';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your Vortex Secure instance is ready at admin.connectionpoint.tech!';
END $$;