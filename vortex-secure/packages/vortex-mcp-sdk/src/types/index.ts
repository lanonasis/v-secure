// Vortex MCP SDK - Comprehensive Type Definitions
// Supports Web, CLI, and MCP Tool integrations

// ============================================
// Configuration Types
// ============================================

export interface VortexConfig {
  /** Vortex Secure API endpoint */
  endpoint: string;
  /** API key for authentication (vx_* format) */
  apiKey: string;
  /** Optional: Tool identification for MCP tools */
  toolId?: string;
  /** Optional: Tool name for display */
  toolName?: string;
  /** SDK version */
  version?: string;
  /** Enable automatic retries on server errors */
  autoRetry?: boolean;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Environment for operations */
  environment?: ServiceEnvironment;
  /** Platform type (auto-detected if not specified) */
  platform?: Platform;
  /** Custom HTTP adapter for different environments */
  httpAdapter?: HTTPAdapter;
}

export type Platform = 'node' | 'browser' | 'cli' | 'worker';
export type ServiceEnvironment = 'development' | 'staging' | 'production';
export type ServiceCategory = 'payment' | 'devops' | 'ai' | 'communication' | 'storage' | 'analytics' | 'other';

// ============================================
// HTTP Adapter Interface (for cross-platform support)
// ============================================

export interface HTTPAdapter {
  get<T = unknown>(url: string, options?: RequestOptions): Promise<HTTPResponse<T>>;
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HTTPResponse<T>>;
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<HTTPResponse<T>>;
  delete<T = unknown>(url: string, options?: RequestOptions): Promise<HTTPResponse<T>>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HTTPResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// ============================================
// Service Catalog Types (Tier 1: Platform Level)
// ============================================

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface MCPService {
  id: string;
  serviceKey: string;
  displayName: string;
  description: string;
  icon: string;
  category: ServiceCategory;
  credentialFields: CredentialField[];
  mcpCommand: string;
  mcpArgs: string[];
  mcpEnvMapping: Record<string, string>;
  documentationUrl?: string;
  baseUrl?: string;
  healthCheckEndpoint?: string;
  isAvailable: boolean;
  isBeta: boolean;
  requiresApproval: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ServiceCatalogFilters {
  category?: ServiceCategory;
  search?: string;
  showBeta?: boolean;
  showConfigured?: boolean;
}

// ============================================
// User Service Types (Tier 2: User Level)
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface UserService {
  id: string;
  serviceKey: string;
  alias?: string;
  environment: ServiceEnvironment;
  isEnabled: boolean;
  lastUsedAt?: Date;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
  service?: MCPService;
}

export interface ConfigureServiceRequest {
  serviceKey: string;
  credentials: Record<string, string>;
  environment?: ServiceEnvironment;
  alias?: string;
  isEnabled?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  responseTimeMs?: number;
  details?: Record<string, unknown>;
}

// ============================================
// API Key Types (Tier 3: Key Level)
// ============================================

export type ScopeType = 'all' | 'specific';

export interface APIKey {
  id: string;
  keyPrefix: string;
  name: string;
  description?: string;
  scopeType: ScopeType;
  allowedEnvironments: ServiceEnvironment[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  allowedIps: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  isActive: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  scopes?: APIKeyScope[];
}

export interface APIKeyScope {
  id: string;
  serviceKey: string;
  allowedActions: string[];
  maxCallsPerMinute?: number;
  maxCallsPerDay?: number;
  service?: MCPService;
}

export interface CreateAPIKeyRequest {
  name: string;
  description?: string;
  scopeType: ScopeType;
  serviceKeys?: string[];
  allowedEnvironments?: ServiceEnvironment[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedIps?: string[];
  expiresAt?: Date;
}

export interface CreateAPIKeyResponse {
  apiKey: APIKey;
  fullKey: string; // Only returned once on creation
}

// ============================================
// Router Types
// ============================================

export interface RouterRequest {
  service: string;
  action: string;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface RouterResponse<T = unknown> {
  success: boolean;
  requestId: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    service: string;
    action: string;
    responseTimeMs: number;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  };
}

// ============================================
// Secret Access Types (MCP Tools)
// ============================================

export interface SecretAccessOptions {
  justification?: string;
  estimatedDuration?: number;
  environment?: ServiceEnvironment;
  project?: string;
  requireApproval?: boolean;
}

export interface TemporarySecret {
  name: string;
  value: string;
  expiresAt: Date;
  sessionId: string;
  revoke: () => Promise<void>;
}

export interface MCPSession {
  sessionId: string;
  secrets: TemporarySecret[];
  expiresAt: Date;
  cleanup: () => Promise<void>;
}

export interface AccessRequest {
  requestId: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  waitForApproval: () => Promise<boolean>;
  cancel: () => Promise<void>;
}

// ============================================
// Usage & Analytics Types
// ============================================

export type UsageLogStatus = 'pending' | 'success' | 'error' | 'rate_limited' | 'unauthorized';

export interface UsageLog {
  requestId: string;
  serviceKey: string;
  action: string;
  status: UsageLogStatus;
  responseTimeMs: number;
  timestamp: Date;
  errorMessage?: string;
  errorCode?: string;
}

export interface UsageSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTimeMs: number;
  callsByService: Record<string, number>;
  callsByDay: { date: string; count: number }[];
}

export interface UsageAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    avgResponseTimeMs: number;
    uniqueServices: number;
    uniqueApiKeys: number;
  };
  byService: ServiceUsageStats[];
  byDay: DailyUsageStats[];
  topActions: {
    serviceKey: string;
    action: string;
    count: number;
  }[];
}

export interface ServiceUsageStats {
  serviceKey: string;
  displayName: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTimeMs: number;
  lastUsedAt?: Date;
}

export interface DailyUsageStats {
  date: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTimeMs: number;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
  type: 'minute' | 'day';
}

// ============================================
// Health Check Types
// ============================================

export interface HealthCheckResult {
  healthy: boolean;
  version: string;
  latencyMs: number;
  services?: {
    database: boolean;
    cache: boolean;
    processPool: boolean;
  };
}

export interface ServiceHealthCheck {
  serviceKey: string;
  healthy: boolean;
  latencyMs: number;
  lastChecked: Date;
  error?: string;
}

// ============================================
// Process Pool Types
// ============================================

export type ProcessStatus = 'starting' | 'running' | 'idle' | 'terminating' | 'terminated' | 'error';

export interface MCPProcess {
  id: string;
  processId: string;
  serviceKey: string;
  status: ProcessStatus;
  memoryMb?: number;
  cpuPercent?: number;
  startedAt: Date;
  lastActivityAt: Date;
  idleTimeoutSeconds: number;
  terminatedAt?: Date;
  terminationReason?: string;
  totalRequests: number;
  activeRequests: number;
}

// ============================================
// Dashboard Types
// ============================================

export interface MCPDashboardStats {
  configuredServices: number;
  enabledServices: number;
  activeApiKeys: number;
  totalCallsToday: number;
  callsThisWeek: number[];
  recentActivity: UsageLog[];
  servicesHealth: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
}

// ============================================
// Error Codes
// ============================================

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

// ============================================
// Event Types
// ============================================

export type VortexEventType =
  | 'session.created'
  | 'session.expired'
  | 'session.revoked'
  | 'secret.accessed'
  | 'secret.revoked'
  | 'approval.requested'
  | 'approval.granted'
  | 'approval.denied'
  | 'rate_limit.warning'
  | 'rate_limit.exceeded'
  | 'health.changed'
  | 'error';

export interface VortexEvent<T = unknown> {
  type: VortexEventType;
  timestamp: Date;
  data: T;
}

export type VortexEventHandler<T = unknown> = (event: VortexEvent<T>) => void;
