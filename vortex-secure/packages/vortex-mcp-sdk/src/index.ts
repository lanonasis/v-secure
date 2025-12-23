// Vortex Secure MCP SDK - First-in-market secure secret access for AI agents
// Enables secure secret management for Model Context Protocol tools and AI agents

import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

export interface MCPConfig {
  vortexEndpoint: string;
  mcpToken: string;
  toolId: string;
  toolName: string;
  version?: string;
  autoRetry?: boolean;
  timeoutMs?: number;
}

export interface SecretAccessOptions {
  justification?: string;
  estimatedDuration?: number; // seconds
  environment?: 'development' | 'staging' | 'production';
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

/**
 * Vortex Secure MCP Client
 * Provides secure, temporary access to secrets for AI agents and MCP tools
 * 
 * Key Features:
 * - Temporary token system - secrets never stored in AI context
 * - Just-in-time access with automatic expiration
 * - Audit trail for all secret access
 * - User approval workflows for sensitive operations
 * - Zero-trust architecture
 */
export class VortexMCPClient {
  private api: AxiosInstance;
  private ws?: WebSocket;
  private activeSessions = new Map<string, MCPSession>();
  private approvalWaiters = new Map<string, (approved: boolean) => void>();

  constructor(private config: MCPConfig) {
    this.api = axios.create({
      baseURL: config.vortexEndpoint,
      timeout: config.timeoutMs || 30000,
      headers: {
        'Authorization': `Bearer ${config.mcpToken}`,
        'User-Agent': `vortex-mcp-sdk/${config.version || '0.1.0'}`,
        'X-MCP-Tool-ID': config.toolId,
        'X-MCP-Tool-Name': config.toolName,
        'Content-Type': 'application/json'
      }
    });

    // Set up request/response interceptors
    this.setupInterceptors();
  }

  /**
   * Use a secret within a callback scope
   * Secret is automatically revoked after callback completes
   */
  async useSecret(
    secretName: string, 
    callback: (secret: string) => Promise<any>,
    options: SecretAccessOptions = {}
  ): Promise<any> {
    const session = await this.requestSecretAccess([secretName], options);
    
    try {
      const secret = session.secrets.find(s => s.name === secretName);
      if (!secret) throw new Error(`Secret ${secretName} not available in session`);
      
      const result = await callback(secret.value);
      return result;
    } finally {
      await session.cleanup();
    }
  }

  /**
   * Use multiple secrets within a callback scope
   * All secrets are automatically revoked after callback completes
   */
  async useSecrets(
    secretNames: string[],
    callback: (secrets: Record<string, string>) => Promise<any>,
    options: SecretAccessOptions = {}
  ): Promise<any> {
    const session = await this.requestSecretAccess(secretNames, options);
    
    try {
      const secretsMap = session.secrets.reduce((acc, secret) => {
        acc[secret.name] = secret.value;
        return acc;
      }, {} as Record<string, string>);
      
      const result = await callback(secretsMap);
      return result;
    } finally {
      await session.cleanup();
    }
  }

  /**
   * Request access to secrets and return a managed session
   * Provides more control over secret lifecycle
   */
  async requestSecretAccess(
    secretNames: string[],
    options: SecretAccessOptions = {}
  ): Promise<MCPSession> {
    try {
      // 1. Create access request
      const { data: request } = await this.api.post('/mcp/access-request', {
        toolId: this.config.toolId,
        secretNames,
        context: {
          toolId: this.config.toolId,
          toolName: this.config.toolName,
          toolVersion: this.config.version || '0.1.0',
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userApprovalRequired: options.requireApproval ?? false,
          requestSource: 'api',
          metadata: {
            justification: options.justification,
            estimatedDuration: options.estimatedDuration || 300,
            environment: options.environment,
            project: options.project
          }
        }
      });

      // 2. Wait for approval if required
      if (request.requiresApproval) {
        console.log(`⏳ Waiting for approval for access request ${request.requestId}...`);
        const approved = await this.waitForApproval(request.requestId);
        if (!approved) throw new Error('Access request was denied');
      }

      // 3. Activate the approved request
      const { data: activation } = await this.api.post('/mcp/activate-access', {
        requestId: request.requestId
      });

      // 4. Create managed session
      const secrets: TemporarySecret[] = activation.tokens.map((token: any) => ({
        name: token.secretName,
        value: token.proxyValue, // This is the proxy token, will be resolved on use
        expiresAt: new Date(token.expiresAt),
        sessionId: activation.sessionId,
        revoke: async () => {
          await this.api.post('/mcp/revoke-token', { tokenId: token.tokenId });
        }
      }));

      const session: MCPSession = {
        sessionId: activation.sessionId,
        secrets,
        expiresAt: new Date(activation.expiresAt),
        cleanup: async () => {
          await this.revokeSession(activation.sessionId);
          this.activeSessions.delete(activation.sessionId);
        }
      };

      this.activeSessions.set(activation.sessionId, session);
      
      // Auto-cleanup when session expires
      setTimeout(() => {
        session.cleanup().catch(console.error);
      }, activation.expiresAt - Date.now());

      return session;
    } catch (error) {
      console.error('Failed to request secret access:', error);
      throw error;
    }
  }

  /**
   * Inject secrets as environment variables for CLI tools
   * Returns modified environment object
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

    // Schedule cleanup
    setTimeout(() => {
      session.cleanup().catch(console.error);
    }, (session.expiresAt.getTime() - Date.now()));

    return env;
  }

  /**
   * Get the actual secret value from a proxy token
   * This happens automatically when you use the secret, but can be called manually
   */
  async resolveSecret(proxyToken: string): Promise<string> {
    try {
      const { data } = await this.api.post('/mcp/resolve-token', {
        proxyValue: proxyToken
      });
      return data.value;
    } catch (error) {
      console.error('Failed to resolve secret:', error);
      throw error;
    }
  }

  /**
   * List active sessions for this tool
   */
  async getActiveSessions(): Promise<MCPSession[]> {
    try {
      const { data } = await this.api.get('/mcp/sessions');
      return data.sessions;
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await this.api.post('/mcp/revoke-session', { sessionId });
      console.log(`✅ Revoked session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to revoke session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Register this MCP tool with Vortex Secure
   */
  async registerTool(config: {
    permissions: {
      secrets: string[];
      environments: string[];
      maxConcurrentSessions?: number;
      maxSessionDuration?: number;
    };
    webhookUrl?: string;
    autoApprove?: boolean;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<string> {
    try {
      const { data } = await this.api.post('/mcp/register-tool', {
        toolId: this.config.toolId,
        toolName: this.config.toolName,
        permissions: {
          ...config.permissions,
          maxConcurrentSessions: config.permissions.maxConcurrentSessions || 3,
          maxSessionDuration: config.permissions.maxSessionDuration || 900 // 15 minutes
        },
        webhookUrl: config.webhookUrl,
        autoApprove: config.autoApprove ?? false,
        riskLevel: config.riskLevel || 'medium'
      });

      console.log(`✅ MCP tool "${this.config.toolName}" registered successfully`);
      return data.id;
    } catch (error) {
      console.error('Failed to register MCP tool:', error);
      throw error;
    }
  }

  /**
   * Check if Vortex Secure is healthy and accessible
   */
  async healthCheck(): Promise<{ healthy: boolean; version: string; latency: number }> {
    const start = Date.now();
    try {
      const { data } = await this.api.get('/health');
      return {
        healthy: true,
        version: data.version,
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        healthy: false,
        version: 'unknown',
        latency: Date.now() - start
      };
    }
  }

  /**
   * Set up real-time notifications for approval requests
   */
  private setupWebSocket(): void {
    if (!this.config.vortexEndpoint.startsWith('http')) return;
    
    const wsUrl = this.config.vortexEndpoint.replace(/^http/, 'ws') + '/mcp/events';
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.mcpToken}`,
        'X-MCP-Tool-ID': this.config.toolId
      }
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'approval_decision':
        const waiter = this.approvalWaiters.get(message.requestId);
        if (waiter) {
          waiter(message.approved);
          this.approvalWaiters.delete(message.requestId);
        }
        break;
      
      case 'session_revoked':
        const session = this.activeSessions.get(message.sessionId);
        if (session) {
          session.cleanup().catch(console.error);
        }
        break;
    }
  }

  private async waitForApproval(requestId: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Set up WebSocket if not already connected
      if (!this.ws) this.setupWebSocket();
      
      this.approvalWaiters.set(requestId, resolve);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.approvalWaiters.has(requestId)) {
          this.approvalWaiters.delete(requestId);
          resolve(false);
        }
      }, 300000);
    });
  }

  private setupInterceptors(): void {
    // Request interceptor for retries
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (this.config.autoRetry && error.response?.status >= 500) {
          // Retry once for server errors
          try {
            return await this.api.request(error.config);
          } catch (retryError) {
            return Promise.reject(retryError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    // Revoke all active sessions
    const cleanupPromises = Array.from(this.activeSessions.keys()).map(
      sessionId => this.revokeSession(sessionId)
    );
    
    await Promise.allSettled(cleanupPromises);
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
    }
    
    this.activeSessions.clear();
    this.approvalWaiters.clear();
  }
}

// Utility functions for common patterns
export const createMCPClient = (config: MCPConfig): VortexMCPClient => {
  return new VortexMCPClient(config);
};

// Helper for environment-based configuration
export const createMCPClientFromEnv = (overrides: Partial<MCPConfig> = {}): VortexMCPClient => {
  const config: MCPConfig = {
    vortexEndpoint: process.env.VORTEX_ENDPOINT || 'https://api.vortex-secure.com',
    mcpToken: process.env.VORTEX_MCP_TOKEN || '',
    toolId: process.env.MCP_TOOL_ID || '',
    toolName: process.env.MCP_TOOL_NAME || 'Unknown Tool',
    version: process.env.MCP_TOOL_VERSION || '0.1.0',
    ...overrides
  };

  if (!config.mcpToken) throw new Error('VORTEX_MCP_TOKEN environment variable is required');
  if (!config.toolId) throw new Error('MCP_TOOL_ID environment variable is required');

  return new VortexMCPClient(config);
};

// Export types for consumers
export type {
  MCPConfig,
  SecretAccessOptions,
  TemporarySecret,
  MCPSession,
  AccessRequest
};