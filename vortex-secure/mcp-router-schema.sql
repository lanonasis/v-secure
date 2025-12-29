-- MCP Router Platform - Database Schema Extension
-- Zapier-like router for external API services (Stripe, GitHub, etc.)
-- Run this script after supabase-schema.sql

-- =============================================
-- MCP ROUTER PLATFORM TABLES
-- =============================================

-- =============================================
-- TIER 1: SERVICE CATALOG (Platform Level)
-- All available MCP services maintained by LanOnasis
-- =============================================

CREATE TABLE IF NOT EXISTS mcp_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service identification
  service_key TEXT UNIQUE NOT NULL, -- 'stripe', 'github', 'perplexity', 'openai'
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name or URL
  category TEXT CHECK (category IN ('payment', 'devops', 'ai', 'communication', 'storage', 'analytics', 'other')) DEFAULT 'other',

  -- Credential schema (JSON schema of required fields)
  credential_fields JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"key": "api_key", "label": "API Key", "type": "password", "required": true, "placeholder": "sk_live_..."}]

  -- MCP server configuration
  mcp_command TEXT, -- Command to spawn MCP server, e.g., 'npx @stripe/mcp-server'
  mcp_args JSONB DEFAULT '[]', -- Additional CLI arguments
  mcp_env_mapping JSONB DEFAULT '{}', -- How credentials map to env vars: {"api_key": "STRIPE_SECRET_KEY"}

  -- Service metadata
  documentation_url TEXT,
  base_url TEXT, -- API base URL for health checks
  health_check_endpoint TEXT, -- Endpoint for connection testing

  -- Availability
  is_available BOOLEAN DEFAULT true, -- Platform toggle
  is_beta BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false, -- If true, users need admin approval

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TIER 2: USER CONFIGURATION (User Level)
-- Which services each user has set up
-- =============================================

CREATE TABLE IF NOT EXISTS user_mcp_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_key TEXT REFERENCES mcp_service_catalog(service_key) ON DELETE CASCADE NOT NULL,

  -- Encrypted credentials (AES-256-GCM)
  -- JSON string encrypted with user's master key containing all credential fields
  encrypted_credentials TEXT NOT NULL,

  -- Encryption metadata
  encryption_key_id TEXT, -- Reference to v-secure encryption key
  encryption_version INTEGER DEFAULT 1, -- For key rotation

  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  alias TEXT, -- User-friendly name override
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')) DEFAULT 'production',

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,

  -- Health status
  last_health_check TIMESTAMP WITH TIME ZONE,
  health_status TEXT CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')) DEFAULT 'unknown',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one service configuration per user per environment
  UNIQUE(user_id, service_key, environment)
);

-- =============================================
-- API KEYS TABLE (For external API access)
-- LanOnasis API keys for external applications
-- =============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Key identification
  key_prefix TEXT NOT NULL, -- First 8 chars for identification: 'vx_prod_'
  key_hash TEXT NOT NULL, -- SHA-256 hash of full key
  name TEXT NOT NULL, -- User-defined name
  description TEXT,

  -- Key value (encrypted)
  encrypted_key TEXT NOT NULL, -- AES-256-GCM encrypted full key

  -- Scope configuration
  scope_type TEXT CHECK (scope_type IN ('all', 'specific')) DEFAULT 'all',
  -- 'all' = access all enabled services
  -- 'specific' = only services in api_key_scopes table

  -- Environment restriction
  allowed_environments TEXT[] DEFAULT ARRAY['production', 'staging', 'development'],

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Security
  allowed_ips CIDR[] DEFAULT '{}', -- Empty = allow all
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_used_ip INET,

  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TIER 3: API KEY SCOPING (Key Level)
-- Granular access control per API key
-- =============================================

CREATE TABLE IF NOT EXISTS api_key_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Junction table
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  service_key TEXT REFERENCES mcp_service_catalog(service_key) ON DELETE CASCADE NOT NULL,

  -- Granular permissions per service
  allowed_actions TEXT[] DEFAULT '{}', -- Empty = all actions allowed
  -- e.g., ['create-charge', 'list-customers'] for Stripe

  -- Additional restrictions
  max_calls_per_minute INTEGER, -- Override key-level rate limit
  max_calls_per_day INTEGER,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(api_key_id, service_key)
);

-- =============================================
-- MCP USAGE LOGS (Analytics & Billing)
-- Track all MCP router calls
-- =============================================

CREATE TABLE IF NOT EXISTS mcp_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request identification
  request_id TEXT UNIQUE NOT NULL DEFAULT 'req_' || gen_random_uuid()::TEXT,

  -- Foreign keys
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  api_key_id UUID REFERENCES api_keys(id),
  service_key TEXT REFERENCES mcp_service_catalog(service_key) NOT NULL,

  -- Request details
  action TEXT NOT NULL, -- e.g., 'create-charge', 'create-issue'
  method TEXT DEFAULT 'POST',
  request_body JSONB, -- Sanitized (no secrets)
  request_headers JSONB, -- Sanitized headers

  -- Response details
  response_status INTEGER,
  response_body JSONB, -- Truncated if too large
  error_message TEXT,
  error_code TEXT,

  -- Performance metrics
  response_time_ms INTEGER,
  mcp_spawn_time_ms INTEGER, -- Time to spawn/reuse MCP process
  external_api_time_ms INTEGER, -- Time for external API call

  -- Client information
  client_ip INET,
  user_agent TEXT,
  origin TEXT,

  -- Billing metadata
  billable BOOLEAN DEFAULT true,
  billing_amount_cents INTEGER DEFAULT 0, -- Cost per call in cents

  -- Status
  status TEXT CHECK (status IN ('pending', 'success', 'error', 'rate_limited', 'unauthorized')) DEFAULT 'pending',

  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MCP RATE LIMIT TRACKING
-- Track rate limits per API key
-- =============================================

CREATE TABLE IF NOT EXISTS mcp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_type TEXT CHECK (window_type IN ('minute', 'day')) NOT NULL,

  -- Counts
  request_count INTEGER DEFAULT 0,

  -- Unique constraint
  UNIQUE(api_key_id, window_start, window_type)
);

-- =============================================
-- MCP PROCESS POOL (For process management)
-- Track active MCP server processes
-- =============================================

CREATE TABLE IF NOT EXISTS mcp_process_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Process identification
  process_id TEXT UNIQUE NOT NULL,

  -- Foreign keys
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  service_key TEXT REFERENCES mcp_service_catalog(service_key) NOT NULL,

  -- Process details
  pid INTEGER, -- OS process ID
  status TEXT CHECK (status IN ('starting', 'running', 'idle', 'terminating', 'terminated', 'error')) DEFAULT 'starting',

  -- Resource tracking
  memory_mb INTEGER,
  cpu_percent DECIMAL(5,2),

  -- Lifecycle
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  idle_timeout_seconds INTEGER DEFAULT 300, -- 5 min default
  terminated_at TIMESTAMP WITH TIME ZONE,
  termination_reason TEXT,

  -- Request tracking
  total_requests INTEGER DEFAULT 0,
  active_requests INTEGER DEFAULT 0,

  -- Unique constraint: one process per user per service
  UNIQUE(user_id, service_key)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Service catalog indexes
CREATE INDEX IF NOT EXISTS idx_service_catalog_key ON mcp_service_catalog(service_key);
CREATE INDEX IF NOT EXISTS idx_service_catalog_category ON mcp_service_catalog(category);
CREATE INDEX IF NOT EXISTS idx_service_catalog_available ON mcp_service_catalog(is_available);

-- User services indexes
CREATE INDEX IF NOT EXISTS idx_user_services_user_id ON user_mcp_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_service_key ON user_mcp_services(service_key);
CREATE INDEX IF NOT EXISTS idx_user_services_enabled ON user_mcp_services(is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_services_user_service ON user_mcp_services(user_id, service_key);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- API key scopes indexes
CREATE INDEX IF NOT EXISTS idx_api_key_scopes_key ON api_key_scopes(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_scopes_service ON api_key_scopes(service_key);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON mcp_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON mcp_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_service ON mcp_usage_logs(service_key);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON mcp_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_status ON mcp_usage_logs(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_request_id ON mcp_usage_logs(request_id);

-- Rate limits indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON mcp_rate_limits(api_key_id, window_start);

-- Process pool indexes
CREATE INDEX IF NOT EXISTS idx_process_pool_user ON mcp_process_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_process_pool_service ON mcp_process_pool(service_key);
CREATE INDEX IF NOT EXISTS idx_process_pool_status ON mcp_process_pool(status);
CREATE INDEX IF NOT EXISTS idx_process_pool_activity ON mcp_process_pool(last_activity_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE mcp_service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mcp_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_process_pool ENABLE ROW LEVEL SECURITY;

-- Service catalog: Everyone can read available services
CREATE POLICY "Anyone can view available services" ON mcp_service_catalog
  FOR SELECT USING (is_available = true);

-- Admin policy for service catalog management
CREATE POLICY "Admins can manage service catalog" ON mcp_service_catalog
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- User services: Users can only see their own configurations
CREATE POLICY "Users can manage their own service configurations" ON user_mcp_services
  FOR ALL USING (auth.uid() = user_id);

-- API keys: Users can only see their own keys
CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- API key scopes: Users can only see scopes for their keys
CREATE POLICY "Users can manage scopes for their API keys" ON api_key_scopes
  FOR ALL USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

-- Usage logs: Users can only see their own logs
CREATE POLICY "Users can view their own usage logs" ON mcp_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Rate limits: Users can only see their own rate limits
CREATE POLICY "Users can view their own rate limits" ON mcp_rate_limits
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

-- Process pool: Users can only see their own processes
CREATE POLICY "Users can view their own processes" ON mcp_process_pool
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mcp_router_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_service_catalog_updated_at ON mcp_service_catalog;
CREATE TRIGGER trigger_service_catalog_updated_at
  BEFORE UPDATE ON mcp_service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_router_updated_at();

DROP TRIGGER IF EXISTS trigger_user_services_updated_at ON user_mcp_services;
CREATE TRIGGER trigger_user_services_updated_at
  BEFORE UPDATE ON user_mcp_services
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_router_updated_at();

DROP TRIGGER IF EXISTS trigger_api_keys_updated_at ON api_keys;
CREATE TRIGGER trigger_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_router_updated_at();

-- Function to increment usage counts
CREATE OR REPLACE FUNCTION increment_service_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE user_mcp_services
    SET
      total_calls = total_calls + 1,
      successful_calls = successful_calls + 1,
      last_used_at = NOW()
    WHERE user_id = NEW.user_id AND service_key = NEW.service_key;
  ELSIF NEW.status = 'error' THEN
    UPDATE user_mcp_services
    SET
      total_calls = total_calls + 1,
      failed_calls = failed_calls + 1,
      last_used_at = NOW()
    WHERE user_id = NEW.user_id AND service_key = NEW.service_key;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for usage tracking
DROP TRIGGER IF EXISTS trigger_increment_service_usage ON mcp_usage_logs;
CREATE TRIGGER trigger_increment_service_usage
  AFTER INSERT OR UPDATE ON mcp_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_service_usage();

-- Function to track API key last usage
CREATE OR REPLACE FUNCTION update_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE api_keys
    SET
      last_used_at = NOW(),
      last_used_ip = NEW.client_ip
    WHERE id = NEW.api_key_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for API key usage tracking
DROP TRIGGER IF EXISTS trigger_update_api_key_usage ON mcp_usage_logs;
CREATE TRIGGER trigger_update_api_key_usage
  AFTER INSERT ON mcp_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_api_key_usage();

-- =============================================
-- INITIAL SERVICE CATALOG DATA
-- =============================================

-- Insert initial MCP services
INSERT INTO mcp_service_catalog (
  service_key, display_name, description, icon, category,
  credential_fields, mcp_command, mcp_env_mapping,
  documentation_url, base_url, health_check_endpoint
) VALUES
-- Payment Services
(
  'stripe',
  'Stripe',
  'Accept payments, manage subscriptions, and handle billing with the Stripe API',
  'credit-card',
  'payment',
  '[
    {"key": "secret_key", "label": "Secret Key", "type": "password", "required": true, "placeholder": "sk_live_..."},
    {"key": "webhook_secret", "label": "Webhook Secret", "type": "password", "required": false, "placeholder": "whsec_..."}
  ]'::JSONB,
  'npx @stripe/mcp-server-stripe',
  '{"secret_key": "STRIPE_SECRET_KEY", "webhook_secret": "STRIPE_WEBHOOK_SECRET"}'::JSONB,
  'https://stripe.com/docs/api',
  'https://api.stripe.com',
  '/v1/account'
),
-- DevOps Services
(
  'github',
  'GitHub',
  'Manage repositories, issues, pull requests, and GitHub Actions workflows',
  'github',
  'devops',
  '[
    {"key": "token", "label": "Personal Access Token", "type": "password", "required": true, "placeholder": "ghp_..."},
    {"key": "base_url", "label": "Enterprise URL", "type": "text", "required": false, "placeholder": "https://github.mycompany.com/api/v3"}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-github',
  '{"token": "GITHUB_TOKEN", "base_url": "GITHUB_BASE_URL"}'::JSONB,
  'https://docs.github.com/en/rest',
  'https://api.github.com',
  '/user'
),
(
  'gitlab',
  'GitLab',
  'Manage repositories, merge requests, CI/CD pipelines, and issues on GitLab',
  'gitlab',
  'devops',
  '[
    {"key": "token", "label": "Personal Access Token", "type": "password", "required": true, "placeholder": "glpat-..."},
    {"key": "base_url", "label": "GitLab URL", "type": "text", "required": false, "placeholder": "https://gitlab.com/api/v4"}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-gitlab',
  '{"token": "GITLAB_TOKEN", "base_url": "GITLAB_BASE_URL"}'::JSONB,
  'https://docs.gitlab.com/ee/api/',
  'https://gitlab.com/api/v4',
  '/user'
),
-- AI Services
(
  'openai',
  'OpenAI',
  'Access GPT models, embeddings, DALL-E, Whisper, and other OpenAI APIs',
  'brain',
  'ai',
  '[
    {"key": "api_key", "label": "API Key", "type": "password", "required": true, "placeholder": "sk-..."},
    {"key": "organization", "label": "Organization ID", "type": "text", "required": false, "placeholder": "org-..."}
  ]'::JSONB,
  'npx openai-mcp-server',
  '{"api_key": "OPENAI_API_KEY", "organization": "OPENAI_ORG_ID"}'::JSONB,
  'https://platform.openai.com/docs/api-reference',
  'https://api.openai.com',
  '/v1/models'
),
(
  'anthropic',
  'Anthropic',
  'Access Claude models via the Anthropic API for conversations and completions',
  'message-circle',
  'ai',
  '[
    {"key": "api_key", "label": "API Key", "type": "password", "required": true, "placeholder": "sk-ant-..."}
  ]'::JSONB,
  'npx @anthropic-ai/mcp-server',
  '{"api_key": "ANTHROPIC_API_KEY"}'::JSONB,
  'https://docs.anthropic.com/claude/reference',
  'https://api.anthropic.com',
  '/v1/messages'
),
(
  'perplexity',
  'Perplexity',
  'AI-powered search and research with real-time information',
  'search',
  'ai',
  '[
    {"key": "api_key", "label": "API Key", "type": "password", "required": true, "placeholder": "pplx-..."}
  ]'::JSONB,
  'npx perplexity-mcp-server',
  '{"api_key": "PERPLEXITY_API_KEY"}'::JSONB,
  'https://docs.perplexity.ai/reference',
  'https://api.perplexity.ai',
  '/chat/completions'
),
-- Communication Services
(
  'slack',
  'Slack',
  'Send messages, manage channels, and integrate with Slack workspaces',
  'message-square',
  'communication',
  '[
    {"key": "bot_token", "label": "Bot Token", "type": "password", "required": true, "placeholder": "xoxb-..."},
    {"key": "app_token", "label": "App Token (Socket Mode)", "type": "password", "required": false, "placeholder": "xapp-..."}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-slack',
  '{"bot_token": "SLACK_BOT_TOKEN", "app_token": "SLACK_APP_TOKEN"}'::JSONB,
  'https://api.slack.com/methods',
  'https://slack.com/api',
  '/auth.test'
),
(
  'discord',
  'Discord',
  'Manage Discord servers, send messages, and interact with Discord API',
  'message-circle',
  'communication',
  '[
    {"key": "bot_token", "label": "Bot Token", "type": "password", "required": true, "placeholder": "..."}
  ]'::JSONB,
  'npx discord-mcp-server',
  '{"bot_token": "DISCORD_BOT_TOKEN"}'::JSONB,
  'https://discord.com/developers/docs/reference',
  'https://discord.com/api/v10',
  '/users/@me'
),
(
  'twilio',
  'Twilio',
  'Send SMS, make calls, and manage communication workflows',
  'phone',
  'communication',
  '[
    {"key": "account_sid", "label": "Account SID", "type": "text", "required": true, "placeholder": "AC..."},
    {"key": "auth_token", "label": "Auth Token", "type": "password", "required": true, "placeholder": "..."}
  ]'::JSONB,
  'npx twilio-mcp-server',
  '{"account_sid": "TWILIO_ACCOUNT_SID", "auth_token": "TWILIO_AUTH_TOKEN"}'::JSONB,
  'https://www.twilio.com/docs/api',
  'https://api.twilio.com',
  '/2010-04-01/Accounts'
),
-- Storage Services
(
  'aws-s3',
  'AWS S3',
  'Manage files and objects in Amazon S3 buckets',
  'database',
  'storage',
  '[
    {"key": "access_key_id", "label": "Access Key ID", "type": "text", "required": true, "placeholder": "AKIA..."},
    {"key": "secret_access_key", "label": "Secret Access Key", "type": "password", "required": true, "placeholder": "..."},
    {"key": "region", "label": "Region", "type": "text", "required": true, "placeholder": "us-east-1"}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-aws-s3',
  '{"access_key_id": "AWS_ACCESS_KEY_ID", "secret_access_key": "AWS_SECRET_ACCESS_KEY", "region": "AWS_REGION"}'::JSONB,
  'https://docs.aws.amazon.com/s3/index.html',
  'https://s3.amazonaws.com',
  NULL
),
(
  'google-drive',
  'Google Drive',
  'Manage files and folders in Google Drive',
  'folder',
  'storage',
  '[
    {"key": "service_account_json", "label": "Service Account JSON", "type": "textarea", "required": true, "placeholder": "Paste your service account JSON here"}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-google-drive',
  '{"service_account_json": "GOOGLE_SERVICE_ACCOUNT_JSON"}'::JSONB,
  'https://developers.google.com/drive/api/v3/reference',
  'https://www.googleapis.com/drive/v3',
  '/about?fields=user'
),
-- Analytics Services
(
  'posthog',
  'PostHog',
  'Product analytics, feature flags, and session recordings',
  'bar-chart',
  'analytics',
  '[
    {"key": "api_key", "label": "API Key", "type": "password", "required": true, "placeholder": "phc_..."},
    {"key": "host", "label": "PostHog Host", "type": "text", "required": false, "placeholder": "https://app.posthog.com"}
  ]'::JSONB,
  'npx posthog-mcp-server',
  '{"api_key": "POSTHOG_API_KEY", "host": "POSTHOG_HOST"}'::JSONB,
  'https://posthog.com/docs/api',
  'https://app.posthog.com/api',
  '/api/projects'
),
(
  'sentry',
  'Sentry',
  'Error tracking and performance monitoring',
  'alert-circle',
  'analytics',
  '[
    {"key": "auth_token", "label": "Auth Token", "type": "password", "required": true, "placeholder": "sntrys_..."},
    {"key": "organization", "label": "Organization Slug", "type": "text", "required": true, "placeholder": "my-org"}
  ]'::JSONB,
  'npx sentry-mcp-server',
  '{"auth_token": "SENTRY_AUTH_TOKEN", "organization": "SENTRY_ORG"}'::JSONB,
  'https://docs.sentry.io/api/',
  'https://sentry.io/api/0',
  '/organizations/'
),
-- Database Services
(
  'supabase',
  'Supabase',
  'Postgres database, auth, storage, and edge functions',
  'database',
  'storage',
  '[
    {"key": "url", "label": "Project URL", "type": "text", "required": true, "placeholder": "https://xxx.supabase.co"},
    {"key": "service_role_key", "label": "Service Role Key", "type": "password", "required": true, "placeholder": "eyJ..."}
  ]'::JSONB,
  'npx @supabase/mcp-server',
  '{"url": "SUPABASE_URL", "service_role_key": "SUPABASE_SERVICE_ROLE_KEY"}'::JSONB,
  'https://supabase.com/docs/reference',
  NULL,
  '/rest/v1/'
),
-- Other Services
(
  'notion',
  'Notion',
  'Manage Notion pages, databases, and workspaces',
  'file-text',
  'other',
  '[
    {"key": "api_key", "label": "Integration Token", "type": "password", "required": true, "placeholder": "secret_..."}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-notion',
  '{"api_key": "NOTION_API_KEY"}'::JSONB,
  'https://developers.notion.com/reference',
  'https://api.notion.com/v1',
  '/users/me'
),
(
  'linear',
  'Linear',
  'Manage issues, projects, and workflows in Linear',
  'check-square',
  'devops',
  '[
    {"key": "api_key", "label": "API Key", "type": "password", "required": true, "placeholder": "lin_api_..."}
  ]'::JSONB,
  'npx @modelcontextprotocol/server-linear',
  '{"api_key": "LINEAR_API_KEY"}'::JSONB,
  'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
  'https://api.linear.app/graphql',
  NULL
),
(
  'jira',
  'Jira',
  'Manage issues, projects, and sprints in Jira',
  'check-square',
  'devops',
  '[
    {"key": "email", "label": "Email", "type": "email", "required": true, "placeholder": "you@company.com"},
    {"key": "api_token", "label": "API Token", "type": "password", "required": true, "placeholder": "..."},
    {"key": "base_url", "label": "Jira URL", "type": "text", "required": true, "placeholder": "https://yourcompany.atlassian.net"}
  ]'::JSONB,
  'npx jira-mcp-server',
  '{"email": "JIRA_EMAIL", "api_token": "JIRA_API_TOKEN", "base_url": "JIRA_BASE_URL"}'::JSONB,
  'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
  NULL,
  '/rest/api/3/myself'
)
ON CONFLICT (service_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  credential_fields = EXCLUDED.credential_fields,
  mcp_command = EXCLUDED.mcp_command,
  mcp_env_mapping = EXCLUDED.mcp_env_mapping,
  documentation_url = EXCLUDED.documentation_url,
  base_url = EXCLUDED.base_url,
  health_check_endpoint = EXCLUDED.health_check_endpoint,
  updated_at = NOW();

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ MCP Router Platform schema setup completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 New Tables Created:';
  RAISE NOTICE '   - mcp_service_catalog (Tier 1: Platform services)';
  RAISE NOTICE '   - user_mcp_services (Tier 2: User configurations)';
  RAISE NOTICE '   - api_keys (External API access)';
  RAISE NOTICE '   - api_key_scopes (Tier 3: Key-level scoping)';
  RAISE NOTICE '   - mcp_usage_logs (Analytics & billing)';
  RAISE NOTICE '   - mcp_rate_limits (Rate limit tracking)';
  RAISE NOTICE '   - mcp_process_pool (Process management)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '   - Row Level Security enabled';
  RAISE NOTICE '   - Users can only access their own data';
  RAISE NOTICE '   - Credentials encrypted with AES-256-GCM';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Initial Services:';
  RAISE NOTICE '   - Payment: Stripe';
  RAISE NOTICE '   - DevOps: GitHub, GitLab, Linear, Jira';
  RAISE NOTICE '   - AI: OpenAI, Anthropic, Perplexity';
  RAISE NOTICE '   - Communication: Slack, Discord, Twilio';
  RAISE NOTICE '   - Storage: AWS S3, Google Drive, Supabase';
  RAISE NOTICE '   - Analytics: PostHog, Sentry';
  RAISE NOTICE '   - Other: Notion';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 MCP Router Platform is ready!';
END $$;
