import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { z } from 'zod';

// Environment configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY || process.env.JWT_SECRET!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Utility function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Validation schemas
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  value: z.string().min(1),
  keyType: z.enum(['api_key', 'database_url', 'oauth_token', 'certificate', 'ssh_key', 'webhook_secret', 'encryption_key']),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  accessLevel: z.enum(['public', 'authenticated', 'team', 'admin', 'enterprise']).default('team'),
  projectId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
  rotationFrequency: z.number().int().min(1).max(365).default(90),
  metadata: z.record(z.any()).default({})
});

const UpdateApiKeySchema = CreateApiKeySchema.partial().omit({ projectId: true });

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
  teamMembers: z.array(z.string().uuid()).default([]),
  settings: z.record(z.any()).default({})
});

const MCPToolSchema = z.object({
  toolId: z.string().min(1).max(255),
  toolName: z.string().min(1).max(255),
  organizationId: z.string().uuid(),
  permissions: z.object({
    keys: z.array(z.string()),
    environments: z.array(z.enum(['development', 'staging', 'production'])),
    maxConcurrentSessions: z.number().int().min(1).max(10).default(3),
    maxSessionDuration: z.number().int().min(60).max(3600).default(900)
  }),
  webhookUrl: z.string().url().optional(),
  autoApprove: z.boolean().default(false),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

const MCPAccessRequestSchema = z.object({
  toolId: z.string(),
  organizationId: z.string().uuid(),
  keyNames: z.array(z.string()).min(1),
  environment: z.enum(['development', 'staging', 'production']),
  justification: z.string().min(1),
  estimatedDuration: z.number().int().min(60).max(3600),
  context: z.record(z.any()).default({})
});

// Types
export interface ApiKey {
  id: string;
  name: string;
  keyType: string;
  environment: string;
  projectId: string;
  organizationId: string;
  accessLevel: string;
  status: string;
  tags: string[];
  usageCount: number;
  lastRotated: string;
  rotationFrequency: number;
  expiresAt?: string;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyProject {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  ownerId: string;
  teamMembers: string[];
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MCPTool {
  id: string;
  toolId: string;
  toolName: string;
  organizationId: string;
  permissions: {
    keys: string[];
    environments: string[];
    maxConcurrentSessions: number;
    maxSessionDuration: number;
  };
  webhookUrl?: string;
  autoApprove: boolean;
  riskLevel: string;
  createdBy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MCPSession {
  sessionId: string;
  requestId: string;
  toolId: string;
  organizationId: string;
  keyNames: string[];
  environment: string;
  expiresAt: string;
  endedAt?: string;
  createdAt: string;
}

// Encryption utilities
class EncryptionUtils {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;

  static encrypt(text: string, key: string): string {
    const derivedKey = crypto.pbkdf2Sync(key, 'salt', 100000, this.keyLength, 'sha256');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText: string, key: string): string {
    const derivedKey = crypto.pbkdf2Sync(key, 'salt', 100000, this.keyLength, 'sha256');
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0]!, 'hex');
    const authTag = Buffer.from(parts[1]!, 'hex');
    const encrypted = parts[2]!;
    
    const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

export class ApiKeyService {
  // Project management
  async createProject(data: z.infer<typeof CreateProjectSchema>, userId: string): Promise<ApiKeyProject> {
    const validated = CreateProjectSchema.parse(data);
    
    const { data: project, error } = await supabase
      .from('api_key_projects')
      .insert({
        ...validated,
        owner_id: userId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);
    
    // Log the creation
    await this.logAuditEvent('project_created', undefined, validated.organizationId, userId, undefined, {
      projectId: project.id,
      projectName: validated.name
    });

    return this.mapProjectFromDb(project);
  }

  async getProjects(organizationId: string): Promise<ApiKeyProject[]> {
    const { data: projects, error } = await supabase
      .from('api_key_projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get projects: ${error.message}`);
    
    return projects.map(this.mapProjectFromDb);
  }

  // API Key management
  async createApiKey(data: z.infer<typeof CreateApiKeySchema>, userId: string): Promise<ApiKey> {
    const validated = CreateApiKeySchema.parse(data);
    
    // Encrypt the API key value
    const encryptedValue = EncryptionUtils.encrypt(validated.value, encryptionKey);
    
    const { data: apiKey, error } = await supabase
      .from('stored_api_keys')
      .insert({
        name: validated.name,
        environment: validated.environment,
        project_id: validated.projectId,
        organization_id: (await this.getProjectById(validated.projectId)).organizationId,
        encrypted_value: encryptedValue,
        key_type: validated.keyType,
        access_level: validated.accessLevel,
        tags: validated.tags,
        expires_at: validated.expiresAt,
        rotation_frequency: validated.rotationFrequency,
        metadata: validated.metadata,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create API key: ${error.message}`);

    // Create rotation policy if auto-rotation is enabled
    if (validated.rotationFrequency < 365) {
      await supabase
        .from('key_rotation_policies')
        .insert({
          key_id: apiKey.id,
          frequency_days: validated.rotationFrequency,
          auto_rotate: true
        });
    }

    // Log the creation
    await this.logUsageAnalytics(apiKey.id, apiKey.organization_id, userId, 'create', true);
    
    return this.mapApiKeyFromDb(apiKey);
  }

  async getApiKeys(organizationId: string, projectId?: string): Promise<ApiKey[]> {
    let query = supabase
      .from('stored_api_keys')
      .select('*')
      .eq('organization_id', organizationId);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: keys, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get API keys: ${error.message}`);
    
    return keys.map(this.mapApiKeyFromDb);
  }

  async getApiKeyById(keyId: string): Promise<ApiKey> {
    const { data: key, error } = await supabase
      .from('stored_api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error) throw new Error(`Failed to get API key: ${error.message}`);
    
    return this.mapApiKeyFromDb(key);
  }

  async updateApiKey(keyId: string, data: z.infer<typeof UpdateApiKeySchema>, userId: string): Promise<ApiKey> {
    const validated = UpdateApiKeySchema.parse(data);
    const updateData: any = { ...validated };

    // Encrypt new value if provided
    if (validated.value) {
      updateData.encrypted_value = EncryptionUtils.encrypt(validated.value, encryptionKey);
      delete updateData.value;
    }

    const { data: key, error } = await supabase
      .from('stored_api_keys')
      .update(updateData)
      .eq('id', keyId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update API key: ${error.message}`);

    // Log the update
    await this.logUsageAnalytics(keyId, key.organization_id, userId, 'update', true);
    
    return this.mapApiKeyFromDb(key);
  }

  async deleteApiKey(keyId: string, userId: string): Promise<void> {
    const key = await this.getApiKeyById(keyId);
    
    const { error } = await supabase
      .from('stored_api_keys')
      .delete()
      .eq('id', keyId);

    if (error) throw new Error(`Failed to delete API key: ${error.message}`);

    // Log the deletion
    await this.logUsageAnalytics(keyId, key.organizationId, userId, 'delete', true);
  }

  // MCP Tool management
  async registerMCPTool(data: z.infer<typeof MCPToolSchema>, userId: string): Promise<MCPTool> {
    const validated = MCPToolSchema.parse(data);
    
    const { data: tool, error } = await supabase
      .from('mcp_key_tools')
      .insert({
        ...validated,
        tool_id: validated.toolId,
        tool_name: validated.toolName,
        organization_id: validated.organizationId,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to register MCP tool: ${error.message}`);

    // Log the registration
    await this.logAuditEvent('mcp_tool_registered', validated.toolId, validated.organizationId, userId, undefined, {
      toolName: validated.toolName,
      permissions: validated.permissions
    });
    
    return this.mapMCPToolFromDb(tool);
  }

  async getMCPTools(organizationId: string): Promise<MCPTool[]> {
    const { data: tools, error } = await supabase
      .from('mcp_key_tools')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get MCP tools: ${error.message}`);
    
    return tools.map(this.mapMCPToolFromDb);
  }

  // MCP Access Request management
  async createMCPAccessRequest(data: z.infer<typeof MCPAccessRequestSchema>): Promise<string> {
    const validated = MCPAccessRequestSchema.parse(data);
    
    // Generate unique request ID
    const requestId = `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Check if tool exists and get its settings
    const { data: tool, error: toolError } = await supabase
      .from('mcp_key_tools')
      .select('*')
      .eq('tool_id', validated.toolId)
      .eq('organization_id', validated.organizationId)
      .single();

    if (toolError) throw new Error(`MCP tool not found: ${toolError.message}`);

    // Determine if approval is required
    const requiresApproval = !tool.auto_approve || tool.risk_level === 'high' || tool.risk_level === 'critical';
    
    const { error } = await supabase
      .from('mcp_key_access_requests')
      .insert({
        id: requestId,
        tool_id: validated.toolId,
        organization_id: validated.organizationId,
        key_names: validated.keyNames,
        environment: validated.environment,
        justification: validated.justification,
        estimated_duration: validated.estimatedDuration,
        requires_approval: requiresApproval,
        context: validated.context,
        status: requiresApproval ? 'pending' : 'approved',
        approved_at: requiresApproval ? null : new Date().toISOString()
      });

    if (error) throw new Error(`Failed to create access request: ${error.message}`);

    // If auto-approved, create session immediately
    if (!requiresApproval) {
      await this.createMCPSession(requestId);
    }

    // Log the request
    await this.logAuditEvent('mcp_access_requested', validated.toolId, validated.organizationId, undefined, undefined, {
      requestId,
      keyNames: validated.keyNames,
      environment: validated.environment,
      requiresApproval
    });

    return requestId;
  }

  async createMCPSession(requestId: string): Promise<MCPSession> {
    // Get the approved request
    const { data: request, error: requestError } = await supabase
      .from('mcp_key_access_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'approved')
      .single();

    if (requestError) throw new Error(`Access request not found or not approved: ${requestError.message}`);

    // Generate session ID
    const sessionId = `session_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
    
    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (request.estimated_duration * 1000)).toISOString();

    const { data: session, error } = await supabase
      .from('mcp_key_sessions')
      .insert({
        session_id: sessionId,
        request_id: requestId,
        tool_id: request.tool_id,
        organization_id: request.organization_id,
        key_names: request.key_names,
        environment: request.environment,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create MCP session: ${error.message}`);

    // Log session creation
    await this.logAuditEvent('mcp_session_created', request.tool_id, request.organization_id, undefined, sessionId, {
      requestId,
      keyNames: request.key_names,
      duration: request.estimated_duration
    });

    return this.mapMCPSessionFromDb(session);
  }

  // Secure key access for MCP
  async getProxyTokenForKey(sessionId: string, keyName: string): Promise<{ proxyToken: string; expiresAt: string }> {
    try {
      const { data, error } = await supabase.rpc('get_key_for_mcp_session', {
        session_id_param: sessionId,
        key_name_param: keyName
      });

      if (error) throw new Error(`Failed to get proxy token: ${error.message}`);
      
      if (!data || data.length === 0) {
        throw new Error('No proxy token generated');
      }

      return {
        proxyToken: data[0].proxy_token,
        expiresAt: data[0].expires_at
      };
    } catch (error) {
      // Log security event
      await this.logSecurityEvent(undefined, 'unauthorized_access', 'high', 
        `Failed proxy token request for session ${sessionId}, key ${keyName}: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async resolveProxyToken(proxyToken: string): Promise<string> {
    const { data: token, error } = await supabase
      .from('mcp_proxy_tokens')
      .select('encrypted_mapping, expires_at, revoked_at')
      .eq('proxy_value', proxyToken)
      .single();

    if (error || !token) {
      throw new Error('Invalid proxy token');
    }

    if (token.revoked_at || new Date(token.expires_at) < new Date()) {
      throw new Error('Proxy token expired or revoked');
    }

    // Decrypt and return the actual API key
    return EncryptionUtils.decrypt(token.encrypted_mapping, encryptionKey);
  }

  // Analytics and monitoring
  async getUsageAnalytics(organizationId: string, keyId?: string, days: number = 30): Promise<any[]> {
    const fromDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
    
    let query = supabase
      .from('key_usage_analytics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('timestamp', fromDate);

    if (keyId) {
      query = query.eq('key_id', keyId);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) throw new Error(`Failed to get usage analytics: ${error.message}`);
    
    return data;
  }

  async getSecurityEvents(organizationId: string, severity?: string): Promise<any[]> {
    let query = supabase
      .from('key_security_events')
      .select('*')
      .eq('organization_id', organizationId);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) throw new Error(`Failed to get security events: ${error.message}`);
    
    return data;
  }

  // Helper methods
  private async getProjectById(projectId: string): Promise<ApiKeyProject> {
    const { data: project, error } = await supabase
      .from('api_key_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw new Error(`Project not found: ${error.message}`);
    
    return this.mapProjectFromDb(project);
  }

  private async logUsageAnalytics(keyId: string, organizationId: string, userId: string, operation: string, success: boolean, metadata: any = {}): Promise<void> {
    await supabase
      .from('key_usage_analytics')
      .insert({
        key_id: keyId,
        organization_id: organizationId,
        user_id: userId,
        operation,
        success,
        metadata
      });
  }

  private async logSecurityEvent(keyId: string | undefined, eventType: string, severity: string, description: string, metadata: any = {}): Promise<void> {
    await supabase
      .from('key_security_events')
      .insert({
        key_id: keyId,
        event_type: eventType,
        severity,
        description,
        metadata
      });
  }

  private async logAuditEvent(eventType: string, toolId: string | undefined, organizationId: string, userId: string | undefined, sessionId: string | undefined, metadata: any = {}): Promise<void> {
    await supabase
      .from('mcp_key_audit_log')
      .insert({
        event_type: eventType,
        tool_id: toolId,
        organization_id: organizationId,
        user_id: userId,
        session_id: sessionId,
        metadata
      });
  }

  // Mapping functions
  private mapProjectFromDb(project: any): ApiKeyProject {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      organizationId: project.organization_id,
      ownerId: project.owner_id,
      teamMembers: project.team_members || [],
      settings: project.settings || {},
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };
  }

  private mapApiKeyFromDb(key: any): ApiKey {
    return {
      id: key.id,
      name: key.name,
      keyType: key.key_type,
      environment: key.environment,
      projectId: key.project_id,
      organizationId: key.organization_id,
      accessLevel: key.access_level,
      status: key.status,
      tags: key.tags || [],
      usageCount: key.usage_count || 0,
      lastRotated: key.last_rotated,
      rotationFrequency: key.rotation_frequency,
      expiresAt: key.expires_at,
      metadata: key.metadata || {},
      createdBy: key.created_by,
      createdAt: key.created_at,
      updatedAt: key.updated_at
    };
  }

  private mapMCPToolFromDb(tool: any): MCPTool {
    return {
      id: tool.id,
      toolId: tool.tool_id,
      toolName: tool.tool_name,
      organizationId: tool.organization_id,
      permissions: tool.permissions,
      webhookUrl: tool.webhook_url,
      autoApprove: tool.auto_approve,
      riskLevel: tool.risk_level,
      createdBy: tool.created_by,
      status: tool.status,
      createdAt: tool.created_at,
      updatedAt: tool.updated_at
    };
  }

  private mapMCPSessionFromDb(session: any): MCPSession {
    return {
      sessionId: session.session_id,
      requestId: session.request_id,
      toolId: session.tool_id,
      organizationId: session.organization_id,
      keyNames: session.key_names,
      environment: session.environment,
      expiresAt: session.expires_at,
      endedAt: session.ended_at,
      createdAt: session.created_at
    };
  }
}

export const apiKeyService = new ApiKeyService();