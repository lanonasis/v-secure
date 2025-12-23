// Vortex Secure - Core Type Definitions

export interface Secret {
  id: string;
  name: string;
  environment: 'development' | 'staging' | 'production';
  project_id: string;
  encrypted_value: string;
  created_at: string;
  last_rotated: string;
  rotation_frequency: number; // days
  tags: string[];
  usage_count: number;
  secret_type: SecretType;
  access_level: AccessLevel;
  status: SecretStatus;
}

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  description?: string;
  team_members: string[];
}

export interface RotationPolicy {
  id: string;
  secret_id: string;
  frequency_days: number;
  overlap_hours: number;
  auto_rotate: boolean;
  notification_webhooks: string[];
  next_rotation: string;
  created_at: string;
}

export interface UsageMetric {
  id: string;
  secret_id: string;
  timestamp: string;
  operation: 'access' | 'rotate' | 'create' | 'update' | 'delete';
  user_id: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message?: string;
  response_time_ms: number;
}

export interface SecurityEvent {
  id: string;
  secret_id: string;
  event_type: 'unauthorized_access' | 'failed_rotation' | 'anomaly_detected' | 'compliance_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  timestamp: string;
  resolved: boolean;
}

export type SecretType = 
  | 'api_key' 
  | 'database_url' 
  | 'oauth_token' 
  | 'certificate' 
  | 'ssh_key' 
  | 'webhook_secret'
  | 'encryption_key';

export type AccessLevel = 
  | 'public' 
  | 'authenticated' 
  | 'team' 
  | 'admin' 
  | 'enterprise';

export type SecretStatus = 
  | 'active' 
  | 'rotating' 
  | 'deprecated' 
  | 'expired' 
  | 'compromised';

export interface VortexConfig {
  project: {
    id: string;
    name: string;
    environment: string;
  };
  vault: {
    provider: 'supabase' | 'hashicorp' | 'aws' | 'azure';
    endpoint: string;
    region?: string;
  };
  encryption: {
    algorithm: 'AES-256-GCM';
    keyDerivation: 'PBKDF2' | 'Argon2';
  };
  rotation: {
    defaultFrequency: number;
    overlapPeriod: number;
    autoRotate: boolean;
  };
  monitoring: {
    enabled: boolean;
    anomalyDetection: boolean;
    complianceReporting: boolean;
  };
}