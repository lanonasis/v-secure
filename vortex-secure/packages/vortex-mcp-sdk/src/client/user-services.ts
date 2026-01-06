// User Services Client - Manage configured MCP services for the user

import type {
  HTTPAdapter,
  UserService,
  ConfigureServiceRequest,
  TestConnectionResult,
  ServiceEnvironment,
  HealthStatus,
} from '../types';
import { snakeToCamel, camelToSnake } from '../utils';

export interface UserServicesClientOptions {
  http: HTTPAdapter;
}

/**
 * User Services Client
 * Configure, enable/disable, and manage user's MCP service integrations
 */
export class UserServicesClient {
  private http: HTTPAdapter;

  constructor(options: UserServicesClientOptions) {
    this.http = options.http;
  }

  /**
   * List all configured services for the user
   */
  async list(options?: {
    environment?: ServiceEnvironment;
    isEnabled?: boolean;
    includeHealth?: boolean;
  }): Promise<UserService[]> {
    const params = new URLSearchParams();

    if (options?.environment) {
      params.set('environment', options.environment);
    }
    if (options?.isEnabled !== undefined) {
      params.set('is_enabled', String(options.isEnabled));
    }
    if (options?.includeHealth) {
      params.set('include_health', 'true');
    }

    const query = params.toString();
    const url = `/api/v1/mcp/user-services${query ? `?${query}` : ''}`;

    const response = await this.http.get<{ services: UserService[] }>(url);
    return response.data.services.map(s => snakeToCamel(s as any));
  }

  /**
   * Get a specific configured service
   */
  async get(serviceKey: string, environment?: ServiceEnvironment): Promise<UserService> {
    const params = environment ? `?environment=${environment}` : '';
    const response = await this.http.get<{ service: UserService }>(
      `/api/v1/mcp/user-services/${serviceKey}${params}`
    );
    return snakeToCamel(response.data.service as any);
  }

  /**
   * Configure a new service
   */
  async configure(request: ConfigureServiceRequest): Promise<UserService> {
    const response = await this.http.post<{ service: UserService }>(
      '/api/v1/mcp/user-services',
      camelToSnake(request as any)
    );
    return snakeToCamel(response.data.service as any);
  }

  /**
   * Update service configuration
   */
  async update(
    serviceKey: string,
    updates: Partial<ConfigureServiceRequest>,
    environment?: ServiceEnvironment
  ): Promise<UserService> {
    const params = environment ? `?environment=${environment}` : '';
    const response = await this.http.put<{ service: UserService }>(
      `/api/v1/mcp/user-services/${serviceKey}${params}`,
      camelToSnake(updates as any)
    );
    return snakeToCamel(response.data.service as any);
  }

  /**
   * Enable a service
   */
  async enable(serviceKey: string, environment?: ServiceEnvironment): Promise<UserService> {
    return this.update(serviceKey, { isEnabled: true }, environment);
  }

  /**
   * Disable a service
   */
  async disable(serviceKey: string, environment?: ServiceEnvironment): Promise<UserService> {
    return this.update(serviceKey, { isEnabled: false }, environment);
  }

  /**
   * Remove service configuration
   */
  async remove(serviceKey: string, environment?: ServiceEnvironment): Promise<void> {
    const params = environment ? `?environment=${environment}` : '';
    await this.http.delete(`/api/v1/mcp/user-services/${serviceKey}${params}`);
  }

  /**
   * Test connection to a service
   */
  async testConnection(
    serviceKey: string,
    environment?: ServiceEnvironment
  ): Promise<TestConnectionResult> {
    const params = environment ? `?environment=${environment}` : '';
    const response = await this.http.post<TestConnectionResult>(
      `/api/v1/mcp/user-services/${serviceKey}/test${params}`
    );
    return snakeToCamel(response.data as any);
  }

  /**
   * Test connection with provided credentials (without saving)
   */
  async testCredentials(
    serviceKey: string,
    credentials: Record<string, string>
  ): Promise<TestConnectionResult> {
    const response = await this.http.post<TestConnectionResult>(
      `/api/v1/mcp/user-services/${serviceKey}/test-credentials`,
      { credentials }
    );
    return snakeToCamel(response.data as any);
  }

  /**
   * Get health status for all configured services
   */
  async getHealthStatus(): Promise<{
    serviceKey: string;
    status: HealthStatus;
    lastChecked: Date;
    latencyMs?: number;
    error?: string;
  }[]> {
    const response = await this.http.get<{
      health: {
        serviceKey: string;
        status: HealthStatus;
        lastChecked: string;
        latencyMs?: number;
        error?: string;
      }[];
    }>('/api/v1/mcp/user-services/health');

    return response.data.health.map(h => ({
      ...snakeToCamel(h as any),
      lastChecked: new Date(h.lastChecked),
    }));
  }

  /**
   * Trigger health check for a specific service
   */
  async checkHealth(
    serviceKey: string,
    environment?: ServiceEnvironment
  ): Promise<{
    status: HealthStatus;
    latencyMs: number;
    error?: string;
  }> {
    const params = environment ? `?environment=${environment}` : '';
    const response = await this.http.post<{
      status: HealthStatus;
      latencyMs: number;
      error?: string;
    }>(`/api/v1/mcp/user-services/${serviceKey}/health-check${params}`);
    return snakeToCamel(response.data as any);
  }

  /**
   * Get usage statistics for a service
   */
  async getUsage(serviceKey: string, options?: {
    startDate?: Date;
    endDate?: Date;
    environment?: ServiceEnvironment;
  }): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    avgResponseTimeMs: number;
  }> {
    const params = new URLSearchParams();
    if (options?.startDate) {
      params.set('start_date', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params.set('end_date', options.endDate.toISOString());
    }
    if (options?.environment) {
      params.set('environment', options.environment);
    }

    const query = params.toString();
    const url = `/api/v1/mcp/user-services/${serviceKey}/usage${query ? `?${query}` : ''}`;

    const response = await this.http.get<{
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      avgResponseTimeMs: number;
    }>(url);
    return snakeToCamel(response.data as any);
  }

  /**
   * Clone a service configuration to another environment
   */
  async clone(
    serviceKey: string,
    fromEnvironment: ServiceEnvironment,
    toEnvironment: ServiceEnvironment
  ): Promise<UserService> {
    const response = await this.http.post<{ service: UserService }>(
      `/api/v1/mcp/user-services/${serviceKey}/clone`,
      {
        from_environment: fromEnvironment,
        to_environment: toEnvironment,
      }
    );
    return snakeToCamel(response.data.service as any);
  }
}
