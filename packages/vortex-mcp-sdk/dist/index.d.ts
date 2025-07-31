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
    estimatedDuration?: number;
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
export declare class VortexMCPClient {
    private config;
    private api;
    private ws?;
    private activeSessions;
    private approvalWaiters;
    constructor(config: MCPConfig);
    /**
     * Use a secret within a callback scope
     * Secret is automatically revoked after callback completes
     */
    useSecret(secretName: string, callback: (secret: string) => Promise<any>, options?: SecretAccessOptions): Promise<any>;
    /**
     * Use multiple secrets within a callback scope
     * All secrets are automatically revoked after callback completes
     */
    useSecrets(secretNames: string[], callback: (secrets: Record<string, string>) => Promise<any>, options?: SecretAccessOptions): Promise<any>;
    /**
     * Request access to secrets and return a managed session
     * Provides more control over secret lifecycle
     */
    requestSecretAccess(secretNames: string[], options?: SecretAccessOptions): Promise<MCPSession>;
    /**
     * Inject secrets as environment variables for CLI tools
     * Returns modified environment object
     */
    injectSecrets(secretNames: string[], options?: SecretAccessOptions & {
        envPrefix?: string;
    }): Promise<NodeJS.ProcessEnv>;
    /**
     * Get the actual secret value from a proxy token
     * This happens automatically when you use the secret, but can be called manually
     */
    resolveSecret(proxyToken: string): Promise<string>;
    /**
     * List active sessions for this tool
     */
    getActiveSessions(): Promise<MCPSession[]>;
    /**
     * Revoke a specific session
     */
    revokeSession(sessionId: string): Promise<void>;
    /**
     * Register this MCP tool with Vortex Secure
     */
    registerTool(config: {
        permissions: {
            secrets: string[];
            environments: string[];
            maxConcurrentSessions?: number;
            maxSessionDuration?: number;
        };
        webhookUrl?: string;
        autoApprove?: boolean;
        riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    }): Promise<string>;
    /**
     * Check if Vortex Secure is healthy and accessible
     */
    healthCheck(): Promise<{
        healthy: boolean;
        version: string;
        latency: number;
    }>;
    /**
     * Set up real-time notifications for approval requests
     */
    private setupWebSocket;
    private handleWebSocketMessage;
    private waitForApproval;
    private setupInterceptors;
    /**
     * Clean up all resources
     */
    cleanup(): Promise<void>;
}
export declare const createMCPClient: (config: MCPConfig) => VortexMCPClient;
export declare const createMCPClientFromEnv: (overrides?: Partial<MCPConfig>) => VortexMCPClient;
//# sourceMappingURL=index.d.ts.map