// Vortex Secure MCP SDK - First-in-market secure secret access for AI agents
// Supports Web, CLI, Node.js, and Worker environments
// ESM and CommonJS compatible

// ============================================
// Type Exports
// ============================================

export * from './types';

// ============================================
// Utility Exports
// ============================================

export * from './utils';

// ============================================
// Client Exports
// ============================================

export * from './client';

// ============================================
// Main Vortex Client
// ============================================

import type {
  VortexConfig,
  HTTPAdapter,
  ServiceEnvironment,
  MCPSession,
  TemporarySecret,
  SecretAccessOptions,
  HealthCheckResult,
  VortexEventType,
  VortexEventHandler,
} from './types';

import { ServiceCatalogClient } from './client/service-catalog';
import { APIKeyClient } from './client/api-keys';
import { UserServicesClient } from './client/user-services';
import { RouterClient } from './client/router';
import {
  createHTTPAdapter,
  detectPlatform,
  VortexEventEmitter,
  generateSessionId,
} from './utils';

export interface VortexClientOptions extends VortexConfig {
  /** Skip auto-detection of platform */
  skipPlatformDetection?: boolean;
}

/**
 * Unified Vortex Secure Client
 *
 * Main entry point for the Vortex MCP SDK. Provides:
 * - Service catalog discovery
 * - API key management
 * - User service configuration
 * - Request routing to external APIs
 * - Secure secret access for MCP tools
 *
 * @example
 * ```typescript
 * // Browser/Web usage
 * const vortex = new VortexClient({
 *   endpoint: 'https://api.lanonasis.com/mcp/v1',
 *   apiKey: 'vx_prod_xxx',
 * });
 *
 * // List available services
 * const services = await vortex.catalog.list();
 *
 * // Execute a request through the router
 * const result = await vortex.router.execute({
 *   service: 'stripe',
 *   action: 'customers.list',
 * });
 * ```
 *
 * @example
 * ```typescript
 * // CLI/MCP Tool usage with secrets
 * const vortex = new VortexClient({
 *   endpoint: 'https://api.lanonasis.com/mcp/v1',
 *   apiKey: process.env.VORTEX_API_KEY,
 *   toolId: 'my-mcp-tool',
 *   toolName: 'My MCP Tool',
 * });
 *
 * // Use a secret within a scoped callback
 * await vortex.useSecret('STRIPE_API_KEY', async (key) => {
 *   const stripe = new Stripe(key);
 *   return stripe.customers.list();
 * });
 * ```
 */
export class VortexClient {
  /** Service catalog client */
  public readonly catalog: ServiceCatalogClient;

  /** API key management client */
  public readonly apiKeys: APIKeyClient;

  /** User services client */
  public readonly services: UserServicesClient;

  /** Request router client */
  public readonly router: RouterClient;

  /** Event emitter for SDK events */
  public readonly events: VortexEventEmitter;

  private config: VortexClientOptions;
  private http: HTTPAdapter;
  private activeSessions = new Map<string, MCPSession>();
  private ws?: WebSocket | any;

  constructor(options: VortexClientOptions) {
    // Set defaults
    this.config = {
      version: '0.1.0',
      autoRetry: true,
      timeoutMs: 30000,
      environment: 'production',
      platform: options.skipPlatformDetection ? options.platform : detectPlatform(),
      ...options,
    };

    // Create event emitter
    this.events = new VortexEventEmitter();

    // Create HTTP adapter
    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      'User-Agent': `vortex-mcp-sdk/${this.config.version}`,
    };

    if (this.config.toolId) {
      headers['X-MCP-Tool-ID'] = this.config.toolId;
    }
    if (this.config.toolName) {
      headers['X-MCP-Tool-Name'] = this.config.toolName;
    }

    this.http = this.config.httpAdapter || createHTTPAdapter(
      this.config.endpoint,
      headers,
      { autoRetry: this.config.autoRetry }
    );

    // Initialize clients
    this.catalog = new ServiceCatalogClient({ http: this.http });
    this.apiKeys = new APIKeyClient({ http: this.http });
    this.services = new UserServicesClient({ http: this.http });
    this.router = new RouterClient({
      http: this.http,
      events: this.events,
      defaultEnvironment: this.config.environment,
    });
  }

  // ============================================
  // Secret Access Methods (for MCP Tools)
  // ============================================

  /**
   * Use a secret within a callback scope
   * Secret is automatically revoked after callback completes
   */
  async useSecret<T>(
    secretName: string,
    callback: (secret: string) => Promise<T>,
    options: SecretAccessOptions = {}
  ): Promise<T> {
    const session = await this.requestSecretAccess([secretName], options);

    try {
      const secret = session.secrets.find(s => s.name === secretName);
      if (!secret) throw new Error(`Secret ${secretName} not available in session`);

      return await callback(secret.value);
    } finally {
      await session.cleanup();
    }
  }

  /**
   * Use multiple secrets within a callback scope
   * All secrets are automatically revoked after callback completes
   */
  async useSecrets<T>(
    secretNames: string[],
    callback: (secrets: Record<string, string>) => Promise<T>,
    options: SecretAccessOptions = {}
  ): Promise<T> {
    const session = await this.requestSecretAccess(secretNames, options);

    try {
      const secretsMap = session.secrets.reduce((acc, secret) => {
        acc[secret.name] = secret.value;
        return acc;
      }, {} as Record<string, string>);

      return await callback(secretsMap);
    } finally {
      await session.cleanup();
    }
  }

  /**
   * Request access to secrets and return a managed session
   */
  async requestSecretAccess(
    secretNames: string[],
    options: SecretAccessOptions = {}
  ): Promise<MCPSession> {
    const sessionId = generateSessionId();

    // Create access request
    const response = await this.http.post<{
      requestId: string;
      requiresApproval: boolean;
      sessionId?: string;
      tokens?: Array<{
        tokenId: string;
        secretName: string;
        proxyValue: string;
        expiresAt: string;
      }>;
      expiresAt?: string;
    }>('/api/v1/mcp/access-request', {
      tool_id: this.config.toolId,
      secret_names: secretNames,
      context: {
        tool_id: this.config.toolId,
        tool_name: this.config.toolName,
        tool_version: this.config.version,
        session_id: sessionId,
        user_approval_required: options.requireApproval ?? false,
        request_source: 'api',
        metadata: {
          justification: options.justification,
          estimated_duration: options.estimatedDuration || 300,
          environment: options.environment || this.config.environment,
          project: options.project,
        },
      },
    });

    // Wait for approval if required
    if (response.data.requiresApproval) {
      this.events.emit('approval.requested', { requestId: response.data.requestId });
      const approved = await this.waitForApproval(response.data.requestId);
      if (!approved) {
        this.events.emit('approval.denied', { requestId: response.data.requestId });
        throw new Error('Access request was denied');
      }
      this.events.emit('approval.granted', { requestId: response.data.requestId });
    }

    // Activate the request if not auto-activated
    let tokens = response.data.tokens;
    let expiresAt = response.data.expiresAt;

    if (!tokens) {
      const activation = await this.http.post<{
        tokens: Array<{
          tokenId: string;
          secretName: string;
          proxyValue: string;
          expiresAt: string;
        }>;
        sessionId: string;
        expiresAt: string;
      }>('/api/v1/mcp/activate-access', {
        request_id: response.data.requestId,
      });
      tokens = activation.data.tokens;
      expiresAt = activation.data.expiresAt;
    }

    // Create managed session
    const secrets: TemporarySecret[] = (tokens || []).map(token => ({
      name: token.secretName,
      value: token.proxyValue,
      expiresAt: new Date(token.expiresAt),
      sessionId,
      revoke: async () => {
        await this.http.post('/api/v1/mcp/revoke-token', { token_id: token.tokenId });
        this.events.emit('secret.revoked', { secretName: token.secretName, sessionId });
      },
    }));

    const session: MCPSession = {
      sessionId,
      secrets,
      expiresAt: new Date(expiresAt!),
      cleanup: async () => {
        await this.revokeSession(sessionId);
        this.activeSessions.delete(sessionId);
      },
    };

    this.activeSessions.set(sessionId, session);
    this.events.emit('session.created', { sessionId, secretNames });

    // Auto-cleanup when session expires
    const timeout = session.expiresAt.getTime() - Date.now();
    if (timeout > 0) {
      setTimeout(() => {
        this.events.emit('session.expired', { sessionId });
        session.cleanup().catch(console.error);
      }, timeout);
    }

    return session;
  }

  /**
   * Inject secrets as environment variables for CLI tools
   */
  async injectSecrets(
    secretNames: string[],
    options: SecretAccessOptions & { envPrefix?: string } = {}
  ): Promise<NodeJS.ProcessEnv> {
    const session = await this.requestSecretAccess(secretNames, options);
    const prefix = options.envPrefix || '';

    const env = { ...process.env };

    for (const secret of session.secrets) {
      const envName = `${prefix}${secret.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      env[envName] = secret.value;
    }

    return env;
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get all active sessions
   */
  getActiveSessions(): MCPSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.http.post('/api/v1/mcp/revoke-session', { session_id: sessionId });
    this.events.emit('session.revoked', { sessionId });
  }

  /**
   * Revoke all active sessions
   */
  async revokeAllSessions(): Promise<void> {
    const sessions = this.getActiveSessions();
    await Promise.allSettled(sessions.map(s => s.cleanup()));
  }

  // ============================================
  // Health & Status
  // ============================================

  /**
   * Check if Vortex Secure is healthy and accessible
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await this.http.get<{
        healthy: boolean;
        version: string;
        services?: {
          database: boolean;
          cache: boolean;
          processPool: boolean;
        };
      }>('/health');

      return {
        healthy: true,
        version: response.data.version,
        latencyMs: Date.now() - start,
        services: response.data.services,
      };
    } catch {
      return {
        healthy: false,
        version: 'unknown',
        latencyMs: Date.now() - start,
      };
    }
  }

  // ============================================
  // Event Handling
  // ============================================

  /**
   * Subscribe to SDK events
   */
  on<T = unknown>(type: VortexEventType, handler: VortexEventHandler<T>): () => void {
    return this.events.on(type, handler);
  }

  /**
   * Subscribe to all SDK events
   */
  onAll(handler: VortexEventHandler<unknown>): () => void {
    return this.events.onAll(handler);
  }

  // ============================================
  // Private Methods
  // ============================================

  private async waitForApproval(requestId: string): Promise<boolean> {
    // Try WebSocket for real-time updates
    if (typeof WebSocket !== 'undefined' || this.config.platform === 'node') {
      return this.waitForApprovalViaWebSocket(requestId);
    }

    // Fallback to polling
    return this.waitForApprovalViaPolling(requestId);
  }

  private async waitForApprovalViaWebSocket(requestId: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const wsUrl = this.config.endpoint.replace(/^http/, 'ws') + '/mcp/events';

      let WS: typeof WebSocket;
      if (typeof WebSocket !== 'undefined') {
        WS = WebSocket;
      } else {
        // Node.js environment
        const ws = await import('ws');
        WS = ws.default as any;
      }

      this.ws = new WS(wsUrl);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          requestId,
          apiKey: this.config.apiKey,
        }));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'approval_decision' && message.requestId === requestId) {
            this.ws?.close();
            resolve(message.approved);
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
        // Fallback to polling on error
        this.waitForApprovalViaPolling(requestId).then(resolve);
      };

      // Timeout after 5 minutes
      setTimeout(() => {
        this.ws?.close();
        resolve(false);
      }, 300000);
    });
  }

  private async waitForApprovalViaPolling(requestId: string): Promise<boolean> {
    const timeout = Date.now() + 300000; // 5 minutes
    const pollInterval = 2000; // 2 seconds

    while (Date.now() < timeout) {
      const response = await this.http.get<{
        status: 'pending' | 'approved' | 'denied';
      }>(`/api/v1/mcp/access-request/${requestId}/status`);

      if (response.data.status === 'approved') return true;
      if (response.data.status === 'denied') return false;

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return false;
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    await this.revokeAllSessions();
    this.ws?.close();
    this.events.clear();
  }
}

// ============================================
// Legacy Client (backward compatibility)
// ============================================

export interface MCPConfig {
  vortexEndpoint: string;
  mcpToken: string;
  toolId: string;
  toolName: string;
  version?: string;
  autoRetry?: boolean;
  timeoutMs?: number;
}

/**
 * @deprecated Use VortexClient instead
 */
export class VortexMCPClient extends VortexClient {
  constructor(config: MCPConfig) {
    super({
      endpoint: config.vortexEndpoint,
      apiKey: config.mcpToken,
      toolId: config.toolId,
      toolName: config.toolName,
      version: config.version,
      autoRetry: config.autoRetry,
      timeoutMs: config.timeoutMs,
    });
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new Vortex client
 */
export function createVortexClient(options: VortexClientOptions): VortexClient {
  return new VortexClient(options);
}

/**
 * Create a Vortex client from environment variables
 */
export function createVortexClientFromEnv(overrides: Partial<VortexClientOptions> = {}): VortexClient {
  const endpoint = process.env.VORTEX_ENDPOINT || 'https://api.lanonasis.com/mcp/v1';
  const apiKey = process.env.VORTEX_API_KEY || '';
  const toolId = process.env.MCP_TOOL_ID;
  const toolName = process.env.MCP_TOOL_NAME;
  const environment = (process.env.VORTEX_ENVIRONMENT as ServiceEnvironment) || 'production';

  if (!apiKey) {
    throw new Error('VORTEX_API_KEY environment variable is required');
  }

  return new VortexClient({
    endpoint,
    apiKey,
    toolId,
    toolName,
    environment,
    ...overrides,
  });
}

/**
 * @deprecated Use createVortexClient instead
 */
export const createMCPClient = (config: MCPConfig): VortexMCPClient => {
  return new VortexMCPClient(config);
};

/**
 * @deprecated Use createVortexClientFromEnv instead
 */
export const createMCPClientFromEnv = (overrides: Partial<MCPConfig> = {}): VortexMCPClient => {
  const config: MCPConfig = {
    vortexEndpoint: process.env.VORTEX_ENDPOINT || 'https://api.lanonasis.com/mcp/v1',
    mcpToken: process.env.VORTEX_MCP_TOKEN || '',
    toolId: process.env.MCP_TOOL_ID || '',
    toolName: process.env.MCP_TOOL_NAME || 'Unknown Tool',
    version: process.env.MCP_TOOL_VERSION || '0.1.0',
    ...overrides,
  };

  if (!config.mcpToken) throw new Error('VORTEX_MCP_TOKEN environment variable is required');
  if (!config.toolId) throw new Error('MCP_TOOL_ID environment variable is required');

  return new VortexMCPClient(config);
};

// ============================================
// Default Export
// ============================================

export default VortexClient;
