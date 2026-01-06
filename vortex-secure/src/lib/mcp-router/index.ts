// MCP Router Platform - Main Module Export
// Zapier-like router for external API services

// Core managers
export { ServiceCatalogManager } from './service-catalog';
export { UserServicesManager } from './user-services';
export { APIKeyManager } from './api-keys';
export { MCPRouter, type RouterContext } from './router';
export { MCPProcessPool } from './process-pool';

// Re-export types
export type {
  // Service Catalog
  MCPServiceCatalog,
  ServiceCategory,
  CredentialField,
  ServiceCatalogFilters,

  // User Services
  UserMCPService,
  ServiceCredentials,
  ServiceEnvironment,
  HealthStatus,
  ConfigureServiceRequest,
  TestConnectionResult,

  // API Keys
  APIKey,
  APIKeyScope,
  ScopeType,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  RateLimitInfo,

  // Usage & Analytics
  MCPUsageLog,
  UsageLogStatus,
  ServiceUsageStats,
  DailyUsageStats,
  UsageAnalytics,
  MCPDashboardStats,

  // Process Pool
  MCPProcess,
  ProcessStatus,

  // Router
  MCPRouterRequest,
  MCPRouterResponse,
  MCPRouterErrorCode,
} from '../../types/mcp-router';

export { MCPRouterErrors } from '../../types/mcp-router';
