// API Key Management Client - Create and manage API keys for MCP access

import type {
  HTTPAdapter,
  APIKey,
  APIKeyScope,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  ServiceEnvironment,
  RateLimitInfo,
} from '../types';
import { snakeToCamel, camelToSnake } from '../utils';

export interface APIKeyClientOptions {
  http: HTTPAdapter;
}

/**
 * API Key Management Client
 * Create, list, and manage API keys for MCP service access
 */
export class APIKeyClient {
  private http: HTTPAdapter;

  constructor(options: APIKeyClientOptions) {
    this.http = options.http;
  }

  /**
   * Create a new API key
   * @returns The created key with the full key value (only shown once!)
   */
  async create(request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> {
    const response = await this.http.post<CreateAPIKeyResponse>(
      '/api/v1/mcp/api-keys',
      camelToSnake(request as any)
    );
    return {
      apiKey: snakeToCamel(response.data.apiKey as any),
      fullKey: response.data.fullKey,
    };
  }

  /**
   * List all API keys (does not include full key values)
   */
  async list(): Promise<APIKey[]> {
    const response = await this.http.get<{ apiKeys: APIKey[] }>(
      '/api/v1/mcp/api-keys'
    );
    return response.data.apiKeys.map(k => snakeToCamel(k as any));
  }

  /**
   * Get a specific API key by ID
   */
  async get(keyId: string): Promise<APIKey> {
    const response = await this.http.get<{ apiKey: APIKey }>(
      `/api/v1/mcp/api-keys/${keyId}`
    );
    return snakeToCamel(response.data.apiKey as any);
  }

  /**
   * Update an API key
   */
  async update(keyId: string, updates: Partial<CreateAPIKeyRequest>): Promise<APIKey> {
    const response = await this.http.put<{ apiKey: APIKey }>(
      `/api/v1/mcp/api-keys/${keyId}`,
      camelToSnake(updates as any)
    );
    return snakeToCamel(response.data.apiKey as any);
  }

  /**
   * Revoke an API key
   */
  async revoke(keyId: string, reason?: string): Promise<void> {
    await this.http.post(`/api/v1/mcp/api-keys/${keyId}/revoke`, { reason });
  }

  /**
   * Delete an API key permanently
   */
  async delete(keyId: string): Promise<void> {
    await this.http.delete(`/api/v1/mcp/api-keys/${keyId}`);
  }

  /**
   * Get rate limit status for an API key
   */
  async getRateLimits(keyId: string): Promise<{
    minute: RateLimitInfo;
    day: RateLimitInfo;
  }> {
    const response = await this.http.get<{
      minute: RateLimitInfo;
      day: RateLimitInfo;
    }>(`/api/v1/mcp/api-keys/${keyId}/rate-limits`);
    return response.data;
  }

  /**
   * Get API key usage statistics
   */
  async getUsage(keyId: string, options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    callsByService: Record<string, number>;
  }> {
    const params = new URLSearchParams();
    if (options?.startDate) {
      params.set('start_date', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params.set('end_date', options.endDate.toISOString());
    }

    const query = params.toString();
    const url = `/api/v1/mcp/api-keys/${keyId}/usage${query ? `?${query}` : ''}`;

    const response = await this.http.get<{
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      callsByService: Record<string, number>;
    }>(url);
    return snakeToCamel(response.data as any);
  }

  /**
   * Add a scope to an API key
   */
  async addScope(keyId: string, scope: {
    serviceKey: string;
    allowedActions?: string[];
    maxCallsPerMinute?: number;
    maxCallsPerDay?: number;
  }): Promise<APIKeyScope> {
    const response = await this.http.post<{ scope: APIKeyScope }>(
      `/api/v1/mcp/api-keys/${keyId}/scopes`,
      camelToSnake(scope as any)
    );
    return snakeToCamel(response.data.scope as any);
  }

  /**
   * Remove a scope from an API key
   */
  async removeScope(keyId: string, scopeId: string): Promise<void> {
    await this.http.delete(`/api/v1/mcp/api-keys/${keyId}/scopes/${scopeId}`);
  }

  /**
   * Validate an API key (useful for testing)
   */
  async validate(apiKey: string): Promise<{
    valid: boolean;
    keyId?: string;
    scopes?: string[];
    environments?: ServiceEnvironment[];
    rateLimitRemaining?: {
      minute: number;
      day: number;
    };
  }> {
    const response = await this.http.post<{
      valid: boolean;
      keyId?: string;
      scopes?: string[];
      environments?: ServiceEnvironment[];
      rateLimitRemaining?: {
        minute: number;
        day: number;
      };
    }>('/api/v1/mcp/api-keys/validate', { key: apiKey });
    return snakeToCamel(response.data as any);
  }

  /**
   * Rotate an API key (creates new key, optionally revokes old)
   */
  async rotate(keyId: string, options?: {
    revokeOld?: boolean;
    gracePeriodMinutes?: number;
  }): Promise<CreateAPIKeyResponse> {
    const response = await this.http.post<CreateAPIKeyResponse>(
      `/api/v1/mcp/api-keys/${keyId}/rotate`,
      camelToSnake(options as any || {})
    );
    return {
      apiKey: snakeToCamel(response.data.apiKey as any),
      fullKey: response.data.fullKey,
    };
  }
}
