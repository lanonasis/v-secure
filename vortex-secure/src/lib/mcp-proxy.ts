// Vortex Secure - MCP Integration Proxy System
// First-in-market secure secret access for AI agents and MCP tools

import { supabase } from './supabase';
import { VortexEncryption } from './encryption';
import type { Secret } from '../types/secrets';

interface MCPContext {
  toolId: string;
  toolName: string;
  toolVersion: string;
  sessionId: string;
  userApprovalRequired: boolean;
  requestSource: 'api' | 'cli' | 'webhook';
  metadata?: Record<string, any>;
}

interface MCPToolConfig {
  toolId: string;
  toolName: string;
  permissions: {
    secrets: string[]; // which secrets can it access
    environments: ('development' | 'staging' | 'production')[];
    timeWindows?: string[]; // optional: specific time windows
    ipWhitelist?: string[];
    maxConcurrentSessions: number;
    maxSessionDuration: number; // seconds
  };
  webhookUrl?: string;
  autoApprove: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdBy: string;
  status: 'active' | 'suspended' | 'pending_approval';
}

interface TemporaryToken {
  tokenId: string;
  proxyValue: string; // The temporary proxy token
  secretName: string;
  expiresAt: Date;
  permissions: string[];
  sessionId: string;
  revoke: () => Promise<void>;
}

interface MCPAccessRequest {
  requestId: string;
  toolId: string;
  secretNames: string[];
  justification: string;
  estimatedDuration: number;
  requiresApproval: boolean;
  context: MCPContext;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

export class MCPSecretProxy {
  private activeTokens = new Map<string, TemporaryToken>();
  private approvalCallbacks = new Map<string, (approved: boolean) => void>();

  constructor(private masterPassword: string) {
    // Start token cleanup job
    this.startTokenCleanup();
  }

  /**
   * Register a new MCP tool with Vortex Secure
   */
  async registerMCPTool(config: Omit<MCPToolConfig, 'createdBy' | 'status'>): Promise<string> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Authentication required');

      const toolConfig: MCPToolConfig = {
        ...config,
        createdBy: user.user.id,
        status: config.riskLevel === 'critical' ? 'pending_approval' : 'active'
      };

      const { data, error } = await supabase
        .from('mcp_tools')
        .insert(toolConfig)
        .select()
        .single();

      if (error) throw error;

      // Log registration event
      await this.logMCPEvent('tool_registered', config.toolId, {
        toolName: config.toolName,
        riskLevel: config.riskLevel,
        permissions: config.permissions
      });

      console.log(`✅ MCP tool "${config.toolName}" registered successfully`);
      return data.id;
    } catch (error) {
      console.error('Failed to register MCP tool:', error);
      throw error;
    }
  }

  /**
   * Request secret access for an MCP tool
   */
  async requestSecretAccess(
    toolId: string,
    secretNames: string[],
    context: MCPContext
  ): Promise<MCPAccessRequest> {
    try {
      // 1. Verify tool is registered and active
      const toolConfig = await this.getMCPToolConfig(toolId);
      if (!toolConfig) throw new Error(`MCP tool ${toolId} not registered`);
      if (toolConfig.status !== 'active') throw new Error(`MCP tool ${toolId} is ${toolConfig.status}`);

      // 2. Validate requested secrets against tool permissions
      const unauthorizedSecrets = secretNames.filter(name => 
        !toolConfig.permissions.secrets.includes(name) && 
        !toolConfig.permissions.secrets.includes('*')
      );

      if (unauthorizedSecrets.length > 0) {
        throw new Error(`Tool not authorized for secrets: ${unauthorizedSecrets.join(', ')}`);
      }

      // 3. Check concurrent session limits
      const activeSessions = await this.getActiveSessionCount(toolId);
      if (activeSessions >= toolConfig.permissions.maxConcurrentSessions) {
        throw new Error(`Tool has reached maximum concurrent sessions (${toolConfig.permissions.maxConcurrentSessions})`);
      }

      // 4. Create access request
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requiresApproval = !toolConfig.autoApprove || toolConfig.riskLevel === 'critical';

      const accessRequest: MCPAccessRequest = {
        requestId,
        toolId,
        secretNames,
        justification: context.metadata?.justification || 'MCP tool access',
        estimatedDuration: Math.min(context.metadata?.estimatedDuration || 300, toolConfig.permissions.maxSessionDuration),
        requiresApproval,
        context,
        status: requiresApproval ? 'pending' : 'approved'
      };

      // 5. Store request
      await supabase.from('mcp_access_requests').insert({
        id: requestId,
        tool_id: toolId,
        secret_names: secretNames,
        justification: accessRequest.justification,
        estimated_duration: accessRequest.estimatedDuration,
        requires_approval: requiresApproval,
        context: context,
        status: accessRequest.status,
        created_at: new Date().toISOString()
      });

      // 6. Log access request
      await this.logMCPEvent('access_requested', toolId, {
        requestId,
        secretNames,
        requiresApproval,
        context
      });

      return accessRequest;
    } catch (error) {
      await this.logMCPEvent('access_denied', toolId, {
        error: error.message,
        secretNames,
        context
      });
      throw error;
    }
  }

  /**
   * Approve or deny an access request
   */
  async approveAccessRequest(requestId: string, approved: boolean, approverNotes?: string): Promise<void> {
    try {
      const { data: request, error } = await supabase
        .from('mcp_access_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) throw new Error('Access request not found');

      await supabase
        .from('mcp_access_requests')
        .update({
          status: approved ? 'approved' : 'denied',
          approver_notes: approverNotes,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      // Notify waiting callback
      const callback = this.approvalCallbacks.get(requestId);
      if (callback) {
        callback(approved);
        this.approvalCallbacks.delete(requestId);
      }

      await this.logMCPEvent(approved ? 'access_approved' : 'access_denied', request.tool_id, {
        requestId,
        approverNotes
      });
    } catch (error) {
      console.error('Failed to process approval:', error);
      throw error;
    }
  }

  /**
   * Activate approved access request and get temporary tokens
   */
  async activateAccess(requestId: string): Promise<{
    tokens: TemporaryToken[];
    sessionId: string;
    expiresAt: Date;
  }> {
    try {
      const { data: request, error } = await supabase
        .from('mcp_access_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) throw new Error('Access request not found');
      if (request.status !== 'approved') throw new Error('Access request not approved');

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + request.estimated_duration * 1000);

      // Generate temporary tokens for each secret
      const tokens: TemporaryToken[] = [];
      
      for (const secretName of request.secret_names) {
        const token = await this.generateProxyToken({
          secretName,
          toolId: request.tool_id,
          sessionId,
          requestId,
          ttl: request.estimated_duration,
          permissions: ['read'] // Could be expanded based on secret type
        });

        tokens.push(token);
        this.activeTokens.set(token.tokenId, token);
      }

      // Create active session record
      await supabase.from('mcp_active_sessions').insert({
        session_id: sessionId,
        request_id: requestId,
        tool_id: request.tool_id,
        secret_names: request.secret_names,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

      await this.logMCPEvent('session_activated', request.tool_id, {
        sessionId,
        requestId,
        secretNames: request.secret_names,
        expiresAt
      });

      return { tokens, sessionId, expiresAt };
    } catch (error) {
      console.error('Failed to activate access:', error);
      throw error;
    }
  }

  /**
   * Generate a proxy token for a secret
   */
  private async generateProxyToken(params: {
    secretName: string;
    toolId: string;
    sessionId: string;
    requestId: string;
    ttl: number;
    permissions: string[];
  }): Promise<TemporaryToken> {
    try {
      // Get the actual secret
      const { data: secret, error } = await supabase
        .from('secrets')
        .select('*')
        .eq('name', params.secretName)
        .single();

      if (error || !secret) throw new Error(`Secret ${params.secretName} not found`);

      // Generate unique proxy token
      const tokenId = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const proxyValue = `vx_proxy_${tokenId}`;
      const expiresAt = new Date(Date.now() + params.ttl * 1000);

      // Store token mapping (encrypted)
      const actualValue = await VortexEncryption.decrypt(secret.encrypted_value, this.masterPassword);
      const encryptedMapping = await VortexEncryption.encrypt(
        JSON.stringify({
          actualValue,
          secretId: secret.id,
          secretName: params.secretName,
          toolId: params.toolId,
          sessionId: params.sessionId,
          permissions: params.permissions
        }),
        this.masterPassword
      );

      await supabase.from('mcp_proxy_tokens').insert({
        token_id: tokenId,
        proxy_value: proxyValue,
        encrypted_mapping: encryptedMapping,
        secret_id: secret.id,
        tool_id: params.toolId,
        session_id: params.sessionId,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

      const token: TemporaryToken = {
        tokenId,
        proxyValue,
        secretName: params.secretName,
        expiresAt,
        permissions: params.permissions,
        sessionId: params.sessionId,
        revoke: async () => {
          await this.revokeToken(tokenId);
          this.activeTokens.delete(tokenId);
        }
      };

      return token;
    } catch (error) {
      console.error('Failed to generate proxy token:', error);
      throw error;
    }
  }

  /**
   * Resolve a proxy token to its actual value
   */
  async resolveProxyToken(proxyValue: string): Promise<string> {
    try {
      const { data: tokenData, error } = await supabase
        .from('mcp_proxy_tokens')
        .select('*')
        .eq('proxy_value', proxyValue)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !tokenData) throw new Error('Invalid or expired proxy token');

      // Decrypt the actual value
      const mapping = JSON.parse(
        await VortexEncryption.decrypt(tokenData.encrypted_mapping, this.masterPassword)
      );

      // Log access
      await this.logMCPEvent('secret_accessed', tokenData.tool_id, {
        tokenId: tokenData.token_id,
        secretName: mapping.secretName,
        sessionId: tokenData.session_id
      });

      // Update usage count
      await supabase
        .from('secrets')
        .update({ usage_count: supabase.raw('usage_count + 1') })
        .eq('id', tokenData.secret_id);

      return mapping.actualValue;
    } catch (error) {
      console.error('Failed to resolve proxy token:', error);
      throw error;
    }
  }

  /**
   * Get MCP tool configuration
   */
  private async getMCPToolConfig(toolId: string): Promise<MCPToolConfig | null> {
    const { data, error } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('tool_id', toolId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get active session count for a tool
   */
  private async getActiveSessionCount(toolId: string): Promise<number> {
    const { count, error } = await supabase
      .from('mcp_active_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tool_id', toolId)
      .gt('expires_at', new Date().toISOString());

    return count || 0;
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(tokenId: string): Promise<void> {
    await supabase
      .from('mcp_proxy_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_id', tokenId);

    await this.logMCPEvent('token_revoked', '', { tokenId });
  }

  /**
   * Revoke all tokens for a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    // Revoke all tokens
    await supabase
      .from('mcp_proxy_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    // End session
    await supabase
      .from('mcp_active_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    // Clean up active tokens from memory
    for (const [tokenId, token] of this.activeTokens.entries()) {
      if (token.sessionId === sessionId) {
        this.activeTokens.delete(tokenId);
      }
    }

    await this.logMCPEvent('session_revoked', '', { sessionId });
  }

  /**
   * Get active MCP sessions
   */
  async getActiveSessions(): Promise<any[]> {
    const { data, error } = await supabase
      .from('mcp_active_sessions')
      .select(`
        *,
        mcp_tools (tool_name),
        mcp_access_requests (justification)
      `)
      .gt('expires_at', new Date().toISOString())
      .is('ended_at', null);

    return data || [];
  }

  /**
   * Log MCP-related events
   */
  private async logMCPEvent(
    eventType: string,
    toolId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('mcp_audit_log').insert({
        event_type: eventType,
        tool_id: toolId,
        metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log MCP event:', error);
    }
  }

  /**
   * Start token cleanup job
   */
  private startTokenCleanup(): void {
    setInterval(async () => {
      try {
        // Clean up expired tokens from database
        await supabase
          .from('mcp_proxy_tokens')
          .update({ revoked_at: new Date().toISOString() })
          .lt('expires_at', new Date().toISOString())
          .is('revoked_at', null);

        // Clean up expired sessions
        await supabase
          .from('mcp_active_sessions')
          .update({ ended_at: new Date().toISOString() })
          .lt('expires_at', new Date().toISOString())
          .is('ended_at', null);

        // Clean up memory
        for (const [tokenId, token] of this.activeTokens.entries()) {
          if (token.expiresAt <= new Date()) {
            this.activeTokens.delete(tokenId);
          }
        }
      } catch (error) {
        console.error('Token cleanup failed:', error);
      }
    }, 60000); // Run every minute
  }
}