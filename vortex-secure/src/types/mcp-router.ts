// MCP Router Platform - Type Definitions
// Zapier-like router for external API services

// =============================================
// TIER 1: SERVICE CATALOG (Platform Level)
// =============================================

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[]; // For select type
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export type ServiceCategory =
  | 'payment'
  | 'devops'
  | 'ai'
  | 'communication'
  | 'storage'
  | 'analytics'
  | 'other';

export interface MCPServiceCatalog {
  id: string;
  service_key: string;
  display_name: string;
  description?: string;
  icon?: string;
  category: ServiceCategory;

  // Credential schema
  credential_fields: CredentialField[];

  // MCP server configuration
  mcp_command?: string;
  mcp_args?: string[];
  mcp_env_mapping?: Record<string, string>;

  // Service metadata
  documentation_url?: string;
  base_url?: string;
  health_check_endpoint?: string;

  // Availability
  is_available: boolean;
  is_beta: boolean;
  requires_approval: boolean;

  // Audit
  created_at: string;
  updated_at: string;
}

// =============================================
// TIER 2: USER CONFIGURATION (User Level)
// =============================================

export type ServiceEnvironment = 'development' | 'staging' | 'production';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface UserMCPService {
  id: string;
  user_id: string;
  service_key: string;

  // Encrypted credentials
  encrypted_credentials: string;
  encryption_key_id?: string;
  encryption_version: number;

  // Configuration
  is_enabled: boolean;
  alias?: string;
  environment: ServiceEnvironment;

  // Usage tracking
  last_used_at?: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;

  // Health status
  last_health_check?: string;
  health_status: HealthStatus;

  // Audit
  created_at: string;
  updated_at: string;

  // Joined data (from catalog)
  service?: MCPServiceCatalog;
}

// Decrypted credentials for internal use
export interface ServiceCredentials {
  [key: string]: string;
}

// =============================================
// API KEYS
// =============================================

export type ScopeType = 'all' | 'specific';

export interface APIKey {
  id: string;
  user_id: string;

  // Key identification
  key_prefix: string;
  key_hash: string;
  name: string;
  description?: string;

  // Encrypted key (only returned on creation)
  encrypted_key: string;

  // Full key (only available on creation, never stored in DB)
  full_key?: string;

  // Scope configuration
  scope_type: ScopeType;

  // Environment restriction
  allowed_environments: ServiceEnvironment[];

  // Rate limiting
  rate_limit_per_minute: number;
  rate_limit_per_day: number;

  // Security
  allowed_ips?: string[];
  expires_at?: string;
  last_used_at?: string;
  last_used_ip?: string;

  // Status
  is_active: boolean;
  revoked_at?: string;
  revoked_reason?: string;

  // Audit
  created_at: string;
  updated_at: string;

  // Joined data
  scopes?: APIKeyScope[];
}

// =============================================
// TIER 3: API KEY SCOPING (Key Level)
// =============================================

export interface APIKeyScope {
  id: string;
  api_key_id: string;
  service_key: string;

  // Granular permissions
  allowed_actions?: string[];

  // Additional restrictions
  max_calls_per_minute?: number;
  max_calls_per_day?: number;

  // Audit
  created_at: string;

  // Joined data
  service?: MCPServiceCatalog;
}

// =============================================
// USAGE LOGS
// =============================================

export type UsageLogStatus =
  | 'pending'
  | 'success'
  | 'error'
  | 'rate_limited'
  | 'unauthorized';

export interface MCPUsageLog {
  id: string;
  request_id: string;

  // Foreign keys
  user_id: string;
  api_key_id?: string;
  service_key: string;

  // Request details
  action: string;
  method: string;
  request_body?: Record<string, any>;
  request_headers?: Record<string, string>;

  // Response details
  response_status?: number;
  response_body?: Record<string, any>;
  error_message?: string;
  error_code?: string;

  // Performance metrics
  response_time_ms?: number;
  mcp_spawn_time_ms?: number;
  external_api_time_ms?: number;

  // Client information
  client_ip?: string;
  user_agent?: string;
  origin?: string;

  // Billing metadata
  billable: boolean;
  billing_amount_cents: number;

  // Status
  status: UsageLogStatus;

  // Timestamp
  timestamp: string;

  // Joined data
  service?: MCPServiceCatalog;
  api_key?: APIKey;
}

// =============================================
// RATE LIMITS
// =============================================

export type RateLimitWindow = 'minute' | 'day';

export interface MCPRateLimit {
  id: string;
  api_key_id: string;
  window_start: string;
  window_type: RateLimitWindow;
  request_count: number;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset_at: string;
  window_type: RateLimitWindow;
}

// =============================================
// PROCESS POOL
// =============================================

export type ProcessStatus =
  | 'starting'
  | 'running'
  | 'idle'
  | 'terminating'
  | 'terminated'
  | 'error';

export interface MCPProcess {
  id: string;
  process_id: string;

  user_id: string;
  service_key: string;

  // Process details
  pid?: number;
  status: ProcessStatus;

  // Resource tracking
  memory_mb?: number;
  cpu_percent?: number;

  // Lifecycle
  started_at: string;
  last_activity_at: string;
  idle_timeout_seconds: number;
  terminated_at?: string;
  termination_reason?: string;

  // Request tracking
  total_requests: number;
  active_requests: number;

  // Joined data
  service?: MCPServiceCatalog;
}

// =============================================
// MCP ROUTER REQUEST/RESPONSE
// =============================================

export interface MCPRouterRequest {
  service: string;
  action: string;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface MCPRouterResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata: {
    request_id: string;
    service: string;
    action: string;
    response_time_ms: number;
    rate_limit?: RateLimitInfo;
  };
}

// =============================================
// SERVICE CONFIGURATION
// =============================================

export interface ConfigureServiceRequest {
  service_key: string;
  credentials: Record<string, string>;
  alias?: string;
  environment?: ServiceEnvironment;
  is_enabled?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  response_time_ms?: number;
  details?: Record<string, any>;
}

// =============================================
// API KEY CREATION
// =============================================

export interface CreateAPIKeyRequest {
  name: string;
  description?: string;
  scope_type: ScopeType;
  service_keys?: string[]; // Required when scope_type is 'specific'
  allowed_environments?: ServiceEnvironment[];
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  allowed_ips?: string[];
  expires_at?: string;
}

export interface CreateAPIKeyResponse {
  api_key: APIKey;
  full_key: string; // Only returned once on creation
}

// =============================================
// ANALYTICS
// =============================================

export interface ServiceUsageStats {
  service_key: string;
  display_name: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_response_time_ms: number;
  last_used_at?: string;
}

export interface DailyUsageStats {
  date: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_response_time_ms: number;
}

export interface UsageAnalytics {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    avg_response_time_ms: number;
    unique_services: number;
    unique_api_keys: number;
  };
  by_service: ServiceUsageStats[];
  by_day: DailyUsageStats[];
  top_actions: {
    service_key: string;
    action: string;
    count: number;
  }[];
}

// =============================================
// DASHBOARD WIDGETS
// =============================================

export interface MCPDashboardStats {
  configured_services: number;
  enabled_services: number;
  active_api_keys: number;
  total_calls_today: number;
  calls_this_week: number[];
  recent_activity: MCPUsageLog[];
  services_health: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
}

// =============================================
// UI STATE
// =============================================

export interface ServiceCatalogFilters {
  category?: ServiceCategory;
  search?: string;
  showBeta?: boolean;
  showConfigured?: boolean;
}

export interface ServiceCardProps {
  service: MCPServiceCatalog;
  userService?: UserMCPService;
  onConfigure: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}

// =============================================
// ERROR CODES
// =============================================

export const MCPRouterErrors = {
  // Authentication errors
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',
  REVOKED_API_KEY: 'REVOKED_API_KEY',

  // Authorization errors
  SERVICE_NOT_IN_SCOPE: 'SERVICE_NOT_IN_SCOPE',
  SERVICE_NOT_ENABLED: 'SERVICE_NOT_ENABLED',
  SERVICE_NOT_CONFIGURED: 'SERVICE_NOT_CONFIGURED',
  ACTION_NOT_ALLOWED: 'ACTION_NOT_ALLOWED',
  ENVIRONMENT_NOT_ALLOWED: 'ENVIRONMENT_NOT_ALLOWED',
  IP_NOT_ALLOWED: 'IP_NOT_ALLOWED',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED_MINUTE: 'RATE_LIMIT_EXCEEDED_MINUTE',
  RATE_LIMIT_EXCEEDED_DAY: 'RATE_LIMIT_EXCEEDED_DAY',

  // Service errors
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  CREDENTIAL_DECRYPTION_FAILED: 'CREDENTIAL_DECRYPTION_FAILED',

  // MCP errors
  MCP_SPAWN_FAILED: 'MCP_SPAWN_FAILED',
  MCP_TIMEOUT: 'MCP_TIMEOUT',
  MCP_CONNECTION_ERROR: 'MCP_CONNECTION_ERROR',

  // External API errors
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT: 'EXTERNAL_API_TIMEOUT',
  EXTERNAL_API_AUTH_FAILED: 'EXTERNAL_API_AUTH_FAILED',

  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const;

export type MCPRouterErrorCode = typeof MCPRouterErrors[keyof typeof MCPRouterErrors];
