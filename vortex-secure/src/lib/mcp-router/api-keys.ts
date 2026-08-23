// MCP Router - API Key Management
// Tier 3: API key scoping and access control
//
// create/list/get/revoke/reactivate/delete/update rewritten 2026-08-23 to
// call auth-gateway's /api/v1/mcp/api-keys instead of writing to Supabase
// directly from the browser (was "encrypting" client-side with a master
// password that fell back to a hardcoded string or a localStorage value
// when unconfigured, against a schema that didn't exist on the live
// database). These methods have no live caller in this app today
// (useAPIKeys.ts, used by APIKeysPage.tsx, is the real management path —
// fixed separately) — kept in sync for consistency so this class doesn't
// stay a live insecure pattern next to the real one.
//
// validateAPIKey/checkIPAccess/checkRateLimit/checkServiceAccess/
// checkActionAccess/incrementRateLimit are UNCHANGED — router.ts's
// request-routing/enforcement hot path uses these, likely against a
// separate vortex-secure-specific Supabase project (secrets/projects/
// rotation_policies schema, not MXT or PTNR). Out of scope here; needs its
// own investigation before touching. updateScopes/setAllowedActions/
// getAPIKeyStats have no caller anywhere in this app either — left as-is,
// not worth converting for zero live callers.

import { supabase } from '../supabase';
import { mcpRouterKeysApi } from './api-client';
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
  // masterPassword is no longer used — encryption (such as it exists) now
  // happens server-side. Kept as an accepted constructor param so callers
  // (router.ts) don't need to change their instantiation.
  constructor(private masterPassword?: string) {}

  /**
   * Create a new API key
   */
  async createAPIKey(
    request: CreateAPIKeyRequest
  ): Promise<CreateAPIKeyResponse> {
    return mcpRouterKeysApi.create<CreateAPIKeyResponse>(request);
  }

  /**
   * Get all API keys for the current user
   */
  async getAPIKeys(): Promise<APIKey[]> {
    const response = await mcpRouterKeysApi.list<{ api_keys: APIKey[] }>();
    return response.api_keys || [];
  }

  /**
   * Get a single API key by ID
   */
  async getAPIKey(id: string): Promise<APIKey | null> {
    try {
      const response = await mcpRouterKeysApi.get<{ api_key: APIKey }>(id);
      return response.api_key;
    } catch {
      return null;
    }
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
        name: apiKeyData.name,
        description: undefined,
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
    await mcpRouterKeysApi.revoke(id, reason);
  }

  /**
   * Re-activate a revoked API key
   */
  async reactivateAPIKey(id: string): Promise<APIKey> {
    const response = await mcpRouterKeysApi.reactivate<{ api_key: APIKey }>(id);
    return response.api_key;
  }

  /**
   * Delete an API key permanently
   */
  async deleteAPIKey(id: string): Promise<void> {
    await mcpRouterKeysApi.remove(id);
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
    const response = await mcpRouterKeysApi.update<{ api_key: APIKey }>(id, updates);
    return response.api_key;
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

}

export default APIKeyManager;
