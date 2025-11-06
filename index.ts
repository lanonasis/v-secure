/**
 * LanOnasis Security Service
 * Enterprise-grade security for secrets, API keys, and access control
 */

// Services
export { SecretService } from './services/secretService';
export { ApiKeyService, apiKeyService } from './services/apiKeyService';

// Middleware
export { authMiddleware, requireRole, requirePlan } from './middleware/auth';

// Types
export type { UnifiedUser } from './middleware/auth';
export type { JWTPayload } from './types/auth';
export type {
  ApiKey,
  ApiKeyProject,
  MCPTool,
  MCPSession
} from './services/apiKeyService';

// Re-export for convenience
export * from './services/secretService';
export * from './services/apiKeyService';
