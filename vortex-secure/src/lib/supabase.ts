// Vortex Secure - Supabase Client Configuration

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database Schema Setup SQL
export const setupSchema = `
-- Enable Row Level Security
ALTER TABLE IF EXISTS secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rotation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_events ENABLE ROW LEVEL SECURITY;

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

-- Row Level Security Policies
CREATE POLICY "Users can only see their own projects" ON projects
  FOR ALL USING (auth.uid() = owner_id OR auth.uid() = ANY(team_members));

CREATE POLICY "Users can only see secrets from their projects" ON secrets
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE owner_id = auth.uid() OR auth.uid() = ANY(team_members)
    )
  );

CREATE POLICY "Users can only see rotation policies for their secrets" ON rotation_policies
  FOR ALL USING (
    secret_id IN (
      SELECT s.id FROM secrets s
      JOIN projects p ON s.project_id = p.id
      WHERE p.owner_id = auth.uid() OR auth.uid() = ANY(p.team_members)
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_secrets_project_id ON secrets(project_id);
CREATE INDEX IF NOT EXISTS idx_secrets_environment ON secrets(environment);
CREATE INDEX IF NOT EXISTS idx_secrets_status ON secrets(status);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_secret_id ON usage_metrics(secret_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_timestamp ON usage_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_secret_id ON security_events(secret_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Functions for automatic rotation scheduling
CREATE OR REPLACE FUNCTION update_next_rotation()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_rotation = NOW() + (NEW.frequency_days || ' days')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_rotation
  BEFORE INSERT OR UPDATE ON rotation_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_next_rotation();

-- Function to update secret usage count
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

CREATE TRIGGER trigger_increment_usage_count
  AFTER INSERT ON usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION increment_usage_count();
`;

// Helper functions
export const initializeDatabase = async () => {
  const { error } = await supabase.rpc('exec_sql', { sql: setupSchema });
  if (error) {
    console.error('Database setup error:', error);
    throw error;
  }
  console.log('✅ Vortex Secure database schema initialized');
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signInWithProvider = async (provider: 'github' | 'google') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};