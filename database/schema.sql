-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Custom types
CREATE TYPE memory_type AS ENUM ('context', 'project', 'knowledge', 'reference', 'personal', 'workflow');
CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan plan_type NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT organizations_name_check CHECK (LENGTH(name) >= 2)
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    plan plan_type NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Topics table (for organizing memories)
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT topics_name_length CHECK (LENGTH(name) >= 1),
    CONSTRAINT topics_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$'),
    UNIQUE(organization_id, name)
);

-- Memory entries table (main table)
CREATE TABLE memory_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    memory_type memory_type NOT NULL DEFAULT 'context',
    tags TEXT[] DEFAULT '{}',
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI ada-002 embedding dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT memory_entries_title_length CHECK (LENGTH(title) >= 1),
    CONSTRAINT memory_entries_content_length CHECK (LENGTH(content) >= 1),
    CONSTRAINT memory_entries_access_count_positive CHECK (access_count >= 0)
);

-- Memory versions table (for audit trail and versioning)
CREATE TABLE memory_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    memory_type memory_type NOT NULL,
    tags TEXT[] DEFAULT '{}',
    topic_id UUID,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_number INTEGER NOT NULL,
    
    -- Constraints
    UNIQUE(memory_id, version_number)
);

-- API keys table (for programmatic access)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"read": true, "write": false, "delete": false}',
    last_used TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT api_keys_name_length CHECK (LENGTH(name) >= 1)
);

-- Secrets table for arbitrary user-defined key/value storage
CREATE TABLE secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for secrets (same owner-only policy)
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
-- Users can only read/write their own secrets; to be refined per tenant logic
CREATE POLICY "secrets_owner_policy"
  ON secrets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Usage analytics table
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Partitioning by month for performance
    PARTITION BY RANGE (timestamp)
);

-- Create monthly partitions for usage analytics (example for current year)
-- These would typically be created automatically by a maintenance job
CREATE TABLE usage_analytics_2024_01 PARTITION OF usage_analytics 
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE usage_analytics_2024_02 PARTITION OF usage_analytics 
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... more partitions would be created as needed

-- Indexes for performance
CREATE INDEX idx_organizations_plan ON organizations(plan);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_role ON users(organization_id, role);

CREATE INDEX idx_topics_organization_id ON topics(organization_id);
CREATE INDEX idx_topics_user_id ON topics(user_id);

CREATE INDEX idx_memory_entries_organization_id ON memory_entries(organization_id);
CREATE INDEX idx_memory_entries_user_id ON memory_entries(user_id);
CREATE INDEX idx_memory_entries_memory_type ON memory_entries(memory_type);
CREATE INDEX idx_memory_entries_topic_id ON memory_entries(topic_id);
CREATE INDEX idx_memory_entries_created_at ON memory_entries(created_at DESC);
CREATE INDEX idx_memory_entries_updated_at ON memory_entries(updated_at DESC);
CREATE INDEX idx_memory_entries_last_accessed ON memory_entries(last_accessed DESC NULLS LAST);
CREATE INDEX idx_memory_entries_access_count ON memory_entries(access_count DESC);
CREATE INDEX idx_memory_entries_tags ON memory_entries USING GIN(tags);

-- Vector similarity index for semantic search
CREATE INDEX idx_memory_entries_embedding ON memory_entries USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_memory_versions_memory_id ON memory_versions(memory_id);
CREATE INDEX idx_memory_versions_created_at ON memory_versions(created_at DESC);

CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

CREATE INDEX idx_usage_analytics_organization_id ON usage_analytics(organization_id);
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_action ON usage_analytics(action);
CREATE INDEX idx_usage_analytics_timestamp ON usage_analytics(timestamp DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (to be used with Supabase auth)
-- These would be more specific in a production environment

-- Functions for vector search
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  organization_id_param uuid DEFAULT NULL,
  memory_types_param memory_type[] DEFAULT NULL,
  tags_param text[] DEFAULT NULL,
  topic_id_param uuid DEFAULT NULL,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title varchar(200),
  content text,
  memory_type memory_type,
  tags text[],
  topic_id uuid,
  user_id uuid,
  organization_id uuid,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_accessed timestamptz,
  access_count integer,
  relevance_score float
) LANGUAGE sql STABLE AS $$
  SELECT
    me.id,
    me.title,
    me.content,
    me.memory_type,
    me.tags,
    me.topic_id,
    me.user_id,
    me.organization_id,
    me.metadata,
    me.created_at,
    me.updated_at,
    me.last_accessed,
    me.access_count,
    1 - (me.embedding <=> query_embedding) AS relevance_score
  FROM memory_entries me
  WHERE
    (organization_id_param IS NULL OR me.organization_id = organization_id_param)
    AND (memory_types_param IS NULL OR me.memory_type = ANY(memory_types_param))
    AND (tags_param IS NULL OR me.tags && tags_param)
    AND (topic_id_param IS NULL OR me.topic_id = topic_id_param)
    AND (user_id_param IS NULL OR me.user_id = user_id_param)
    AND (me.embedding <=> query_embedding) < (1 - match_threshold)
    AND me.embedding IS NOT NULL
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to update memory access tracking
CREATE OR REPLACE FUNCTION update_memory_access(memory_id_param uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE memory_entries 
  SET 
    last_accessed = NOW(),
    access_count = access_count + 1
  WHERE id = memory_id_param;
$$;

-- Function to create memory version on update
CREATE OR REPLACE FUNCTION create_memory_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM memory_versions
  WHERE memory_id = NEW.id;
  
  -- Insert the new version
  INSERT INTO memory_versions (
    memory_id, title, content, memory_type, tags, topic_id, 
    metadata, created_by, version_number
  ) VALUES (
    NEW.id, NEW.title, NEW.content, NEW.memory_type, NEW.tags, 
    NEW.topic_id, NEW.metadata, NEW.user_id, next_version
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create versions
CREATE TRIGGER memory_version_trigger
  AFTER UPDATE ON memory_entries
  FOR EACH ROW
  EXECUTE FUNCTION create_memory_version();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at 
  BEFORE UPDATE ON topics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_entries_updated_at 
  BEFORE UPDATE ON memory_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics(months_to_keep INTEGER DEFAULT 12)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
  deleted_count INTEGER;
BEGIN
  cutoff_date := NOW() - (months_to_keep || ' months')::INTERVAL;
  
  DELETE FROM usage_analytics 
  WHERE timestamp < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
