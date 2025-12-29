// MCP Router - API Key Management
// Tier 3: API key scoping and access control

import { supabase } from '../supabase';
import { VortexEncryption } from '../encryption';
import type {
  APIKey,
  APIKeyScope,
  ScopeType,
  ServiceEnvironment,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  RateLimitInfo,
} from '../../types/mcp-router';

export class APIKeyManager {
  private masterPassword: string;

  constructor(masterPassword: string) {
    this.masterPassword = masterPassword;
  }

  /**
   * Create a new API key
   */
  async createAPIKey(
    request: CreateAPIKeyRequest
  ): Promise<CreateAPIKeyResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate the API key
    const prefix = 'vx_prod';
    const fullKey = VortexEncryption.generateAPIKey(prefix);
    const keyPrefix = fullKey.substring(0, 12);

    // Hash the key for lookup
    const keyHash = await this.hashAPIKey(fullKey);

    // Encrypt the full key for storage
    const encryptedKey = await VortexEncryption.encrypt(
      fullKey,
      this.masterPassword
    );

    // Insert the API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .insert([
        {
          user_id: user.id,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          name: request.name,
          description: request.description,
          encrypted_key: encryptedKey,
          scope_type: request.scope_type,
          allowed_environments:
            request.allowed_environments || ['production'],
          rate_limit_per_minute: request.rate_limit_per_minute || 60,
          rate_limit_per_day: request.rate_limit_per_day || 10000,
          allowed_ips: request.allowed_ips || [],
          expires_at: request.expires_at,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (apiKeyError) {
      throw new Error(`Failed to create API key: ${apiKeyError.message}`);
    }

    // If scope_type is 'specific', create scope entries
    if (
      request.scope_type === 'specific' &&
      request.service_keys &&
      request.service_keys.length > 0
    ) {
      const scopes = request.service_keys.map(serviceKey => ({
        api_key_id: apiKeyData.id,
        service_key: serviceKey,
      }));

      const { error: scopeError } = await supabase
        .from('api_key_scopes')
        .insert(scopes);

      if (scopeError) {
        // Rollback: delete the API key
        await supabase.from('api_keys').delete().eq('id', apiKeyData.id);
        throw new Error(`Failed to create scopes: ${scopeError.message}`);
      }
    }

    // Fetch the complete API key with scopes
    const apiKey = await this.getAPIKey(apiKeyData.id);

    return {
      api_key: apiKey!,
      full_key: fullKey,
    };
  }

  /**
   * Get all API keys for the current user
   */
  async getAPIKeys(): Promise<APIKey[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_keys')
      .select(`
        *,
        scopes:api_key_scopes(
          *,
          service:mcp_service_catalog(*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    return (data || []).map(this.mapAPIKeyFromDB);
  }

  /**
   * Get a single API key by ID
   */
  async getAPIKey(id: string): Promise<APIKey | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_keys')
      .select(`
        *,
        scopes:api_key_scopes(
          *,
          service:mcp_service_catalog(*)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch API key: ${error.message}`);
    }

    return this.mapAPIKeyFromDB(data);
  }

  /**
   * Validate an API key and return the user/key info
   * Uses RPC function to bypass RLS for external API requests
   */
  async validateAPIKey(apiKey: string): Promise<{
    valid: boolean;
    api_key?: APIKey;
    user_id?: string;
    error?: string;
  }> {
    try {
      const keyHash = await this.hashAPIKey(apiKey);

      // Use RPC function to bypass RLS
      const { data: keyData, error: keyError } = await supabase
        .rpc('validate_api_key', { p_key_hash: keyHash });

      if (keyError || !keyData || keyData.length === 0) {
        return { valid: false, error: 'Invalid API key' };
      }

      const apiKeyData = keyData[0];

      // Check if active
      if (!apiKeyData.is_active) {
        return { valid: false, error: 'API key is inactive' };
      }

      // Check if revoked
      if (apiKeyData.revoked_at) {
        return {
          valid: false,
          error: `API key was revoked: ${apiKeyData.revoked_reason || 'No reason provided'}`,
        };
      }

      // Check if expired
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        return { valid: false, error: 'API key has expired' };
      }

      // Get scopes using RPC function
      const { data: scopesData } = await supabase
        .rpc('get_api_key_scopes', { p_api_key_id: apiKeyData.id });

      // Build the API key object
      const mappedKey: APIKey = {
        id: apiKeyData.id,
        user_id: apiKeyData.user_id,
        key_prefix: apiKeyData.key_prefix,
        key_hash: keyHash,
        name: apiKeyData.name,
        description: undefined,
        encrypted_key: '',
        scope_type: apiKeyData.scope_type as ScopeType,
        allowed_environments: apiKeyData.allowed_environments || [],
        rate_limit_per_minute: apiKeyData.rate_limit_per_minute,
        rate_limit_per_day: apiKeyData.rate_limit_per_day,
        allowed_ips: apiKeyData.allowed_ips || [],
        expires_at: apiKeyData.expires_at,
        is_active: apiKeyData.is_active,
        revoked_at: apiKeyData.revoked_at,
        revoked_reason: apiKeyData.revoked_reason,
        created_at: '',
        updated_at: '',
        scopes: (scopesData || []).map((s: any) => ({
          id: '',
          api_key_id: apiKeyData.id,
          service_key: s.service_key,
          allowed_actions: s.allowed_actions || [],
          max_calls_per_minute: s.max_calls_per_minute,
          max_calls_per_day: s.max_calls_per_day,
          created_at: '',
        })),
      };

      return {
        valid: true,
        api_key: mappedKey,
        user_id: apiKeyData.user_id,
      };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  /**
   * Check if an API key has access to a service
   */
  async checkServiceAccess(
    apiKeyId: string,
    serviceKey: string,
    environment: ServiceEnvironment = 'production'
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const apiKey = await this.getAPIKey(apiKeyId);
    if (!apiKey) {
      return { allowed: false, reason: 'API key not found' };
    }

    // Check environment
    if (!apiKey.allowed_environments.includes(environment)) {
      return {
        allowed: false,
        reason: `Environment '${environment}' not allowed for this key`,
      };
    }

    // If scope_type is 'all', check if service is enabled for user
    if (apiKey.scope_type === 'all') {
      return { allowed: true };
    }

    // If scope_type is 'specific', check if service is in scopes
    const hasScope = apiKey.scopes?.some(
      s => s.service_key === serviceKey
    );
    if (!hasScope) {
      return {
        allowed: false,
        reason: `Service '${serviceKey}' not in key scope`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if an action is allowed for an API key on a service
   */
  async checkActionAccess(
    apiKeyId: string,
    serviceKey: string,
    action: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const apiKey = await this.getAPIKey(apiKeyId);
    if (!apiKey) {
      return { allowed: false, reason: 'API key not found' };
    }

    if (apiKey.scope_type === 'all') {
      return { allowed: true };
    }

    const scope = apiKey.scopes?.find(
      s => s.service_key === serviceKey
    );
    if (!scope) {
      return {
        allowed: false,
        reason: `Service '${serviceKey}' not in key scope`,
      };
    }

    // If no actions specified, all actions are allowed
    if (!scope.allowed_actions || scope.allowed_actions.length === 0) {
      return { allowed: true };
    }

    // Check if action is in allowed list
    if (!scope.allowed_actions.includes(action)) {
      return {
        allowed: false,
        reason: `Action '${action}' not allowed for this key`,
      };
    }

    return { allowed: true };
  }

  /**
   * Update API key scopes
   */
  async updateScopes(
    apiKeyId: string,
    serviceKeys: string[]
  ): Promise<APIKey> {
    const apiKey = await this.getAPIKey(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Delete existing scopes
    await supabase
      .from('api_key_scopes')
      .delete()
      .eq('api_key_id', apiKeyId);

    // Insert new scopes
    if (serviceKeys.length > 0) {
      const scopes = serviceKeys.map(serviceKey => ({
        api_key_id: apiKeyId,
        service_key: serviceKey,
      }));

      const { error } = await supabase
        .from('api_key_scopes')
        .insert(scopes);

      if (error) {
        throw new Error(`Failed to update scopes: ${error.message}`);
      }
    }

    // Also update scope_type
    await supabase
      .from('api_keys')
      .update({
        scope_type: serviceKeys.length > 0 ? 'specific' : 'all',
      })
      .eq('id', apiKeyId);

    return (await this.getAPIKey(apiKeyId))!;
  }

  /**
   * Add action restrictions to a scope
   */
  async setAllowedActions(
    apiKeyId: string,
    serviceKey: string,
    actions: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('api_key_scopes')
      .update({ allowed_actions: actions })
      .eq('api_key_id', apiKeyId)
      .eq('service_key', serviceKey);

    if (error) {
      throw new Error(`Failed to set allowed actions: ${error.message}`);
    }
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(id: string, reason?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  /**
   * Re-activate a revoked API key
   */
  async reactivateAPIKey(id: string): Promise<APIKey> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: true,
        revoked_at: null,
        revoked_reason: null,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to reactivate API key: ${error.message}`);
    }

    return (await this.getAPIKey(id))!;
  }

  /**
   * Delete an API key permanently
   */
  async deleteAPIKey(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  /**
   * Update API key settings
   */
  async updateAPIKey(
    id: string,
    updates: {
      name?: string;
      description?: string;
      rate_limit_per_minute?: number;
      rate_limit_per_day?: number;
      allowed_ips?: string[];
      expires_at?: string | null;
    }
  ): Promise<APIKey> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.rate_limit_per_minute !== undefined)
      updateData.rate_limit_per_minute = updates.rate_limit_per_minute;
    if (updates.rate_limit_per_day !== undefined)
      updateData.rate_limit_per_day = updates.rate_limit_per_day;
    if (updates.allowed_ips !== undefined)
      updateData.allowed_ips = updates.allowed_ips;
    if (updates.expires_at !== undefined)
      updateData.expires_at = updates.expires_at;

    const { error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    return (await this.getAPIKey(id))!;
  }

  /**
   * Check and update rate limits
   * Uses RPC function to bypass RLS for external API requests
   */
  async checkRateLimit(
    apiKeyId: string
  ): Promise<{
    allowed: boolean;
    minute: RateLimitInfo;
    day: RateLimitInfo;
  }> {
    const apiKey = await this.getAPIKey(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    const now = new Date();
    const minuteWindow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    );

    const dayWindow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Get current rate limit counts using RPC to bypass RLS
    const { data: rateLimits } = await supabase
      .rpc('check_rate_limits', { p_api_key_id: apiKeyId });

    let minuteCount = 0;
    let dayCount = 0;

    for (const limit of rateLimits || []) {
      if (limit.window_type === 'minute') {
        minuteCount = limit.request_count;
      } else if (limit.window_type === 'day') {
        dayCount = limit.request_count;
      }
    }

    const minuteRemaining = Math.max(
      0,
      apiKey.rate_limit_per_minute - minuteCount
    );
    const dayRemaining = Math.max(
      0,
      apiKey.rate_limit_per_day - dayCount
    );

    const minuteReset = new Date(minuteWindow);
    minuteReset.setMinutes(minuteReset.getMinutes() + 1);

    const dayReset = new Date(dayWindow);
    dayReset.setDate(dayReset.getDate() + 1);

    return {
      allowed: minuteRemaining > 0 && dayRemaining > 0,
      minute: {
        remaining: minuteRemaining,
        limit: apiKey.rate_limit_per_minute,
        reset_at: minuteReset.toISOString(),
        window_type: 'minute',
      },
      day: {
        remaining: dayRemaining,
        limit: apiKey.rate_limit_per_day,
        reset_at: dayReset.toISOString(),
        window_type: 'day',
      },
    };
  }

  /**
   * Increment rate limit counters
   */
  async incrementRateLimit(apiKeyId: string): Promise<void> {
    const now = new Date();
    const minuteWindow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    ).toISOString();

    const dayWindow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();

    // Upsert minute counter
    await supabase.rpc('increment_rate_limit', {
      p_api_key_id: apiKeyId,
      p_window_start: minuteWindow,
      p_window_type: 'minute',
    });

    // Upsert day counter
    await supabase.rpc('increment_rate_limit', {
      p_api_key_id: apiKeyId,
      p_window_start: dayWindow,
      p_window_type: 'day',
    });
  }

  /**
   * Check IP whitelist
   */
  async checkIPAccess(
    apiKeyId: string,
    clientIP: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const apiKey = await this.getAPIKey(apiKeyId);
    if (!apiKey) {
      return { allowed: false, reason: 'API key not found' };
    }

    // If no IP whitelist, allow all
    if (!apiKey.allowed_ips || apiKey.allowed_ips.length === 0) {
      return { allowed: true };
    }

    // Check if IP is in whitelist (simple string match for now)
    // In production, should use CIDR matching
    if (apiKey.allowed_ips.includes(clientIP)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `IP ${clientIP} not in whitelist`,
    };
  }

  /**
   * Get usage statistics for an API key
   */
  async getAPIKeyStats(
    apiKeyId: string,
    days: number = 30
  ): Promise<{
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    avg_response_time_ms: number;
    calls_by_service: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('mcp_usage_logs')
      .select('status, service_key, response_time_ms')
      .eq('api_key_id', apiKeyId)
      .gte('timestamp', startDate.toISOString());

    if (error) {
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }

    const stats = {
      total_calls: data?.length || 0,
      successful_calls: 0,
      failed_calls: 0,
      avg_response_time_ms: 0,
      calls_by_service: {} as Record<string, number>,
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const log of data || []) {
      if (log.status === 'success') {
        stats.successful_calls++;
      } else {
        stats.failed_calls++;
      }

      if (log.response_time_ms) {
        totalResponseTime += log.response_time_ms;
        responseTimeCount++;
      }

      stats.calls_by_service[log.service_key] =
        (stats.calls_by_service[log.service_key] || 0) + 1;
    }

    stats.avg_response_time_ms =
      responseTimeCount > 0
        ? Math.round(totalResponseTime / responseTimeCount)
        : 0;

    return stats;
  }

  // Helper: Hash API key using SHA-256
  private async hashAPIKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Helper: Map database row to typed object
  private mapAPIKeyFromDB(row: any): APIKey {
    return {
      id: row.id,
      user_id: row.user_id,
      key_prefix: row.key_prefix,
      key_hash: row.key_hash,
      name: row.name,
      description: row.description,
      encrypted_key: row.encrypted_key,
      scope_type: row.scope_type,
      allowed_environments: row.allowed_environments || [],
      rate_limit_per_minute: row.rate_limit_per_minute,
      rate_limit_per_day: row.rate_limit_per_day,
      allowed_ips: row.allowed_ips || [],
      expires_at: row.expires_at,
      last_used_at: row.last_used_at,
      last_used_ip: row.last_used_ip,
      is_active: row.is_active,
      revoked_at: row.revoked_at,
      revoked_reason: row.revoked_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      scopes: row.scopes?.map((s: any) => ({
        id: s.id,
        api_key_id: s.api_key_id,
        service_key: s.service_key,
        allowed_actions: s.allowed_actions || [],
        max_calls_per_minute: s.max_calls_per_minute,
        max_calls_per_day: s.max_calls_per_day,
        created_at: s.created_at,
        service: s.service
          ? {
              id: s.service.id,
              service_key: s.service.service_key,
              display_name: s.service.display_name,
              description: s.service.description,
              icon: s.service.icon,
              category: s.service.category,
              credential_fields: s.service.credential_fields || [],
              mcp_command: s.service.mcp_command,
              mcp_args: s.service.mcp_args || [],
              mcp_env_mapping: s.service.mcp_env_mapping || {},
              documentation_url: s.service.documentation_url,
              base_url: s.service.base_url,
              health_check_endpoint: s.service.health_check_endpoint,
              is_available: s.service.is_available,
              is_beta: s.service.is_beta,
              requires_approval: s.service.requires_approval,
              created_at: s.service.created_at,
              updated_at: s.service.updated_at,
            }
          : undefined,
      })),
    };
  }
}

export default APIKeyManager;
