// Service Catalog Client - Discover and browse available MCP services

import type {
  HTTPAdapter,
  MCPService,
  ServiceCatalogFilters,
  ServiceCategory,
} from '../types';
import { snakeToCamel } from '../utils';

export interface ServiceCatalogOptions {
  http: HTTPAdapter;
}

/**
 * Service Catalog Client
 * Browse and discover available MCP services in the platform
 */
export class ServiceCatalogClient {
  private http: HTTPAdapter;

  constructor(options: ServiceCatalogOptions) {
    this.http = options.http;
  }

  /**
   * Get all available services
   */
  async list(filters?: ServiceCatalogFilters): Promise<MCPService[]> {
    const params = new URLSearchParams();

    if (filters?.category) {
      params.set('category', filters.category);
    }
    if (filters?.search) {
      params.set('search', filters.search);
    }
    if (filters?.showBeta !== undefined) {
      params.set('show_beta', String(filters.showBeta));
    }

    const query = params.toString();
    const url = `/api/v1/mcp/services${query ? `?${query}` : ''}`;

    const response = await this.http.get<{ services: MCPService[] }>(url);
    return response.data.services.map(s => snakeToCamel(s as any));
  }

  /**
   * Get a specific service by key
   */
  async get(serviceKey: string): Promise<MCPService> {
    const response = await this.http.get<{ service: MCPService }>(
      `/api/v1/mcp/services/${serviceKey}`
    );
    return snakeToCamel(response.data.service as any);
  }

  /**
   * Get services by category
   */
  async listByCategory(category: ServiceCategory): Promise<MCPService[]> {
    return this.list({ category });
  }

  /**
   * Search services by query
   */
  async search(query: string): Promise<MCPService[]> {
    return this.list({ search: query });
  }

  /**
   * Get all categories with service counts
   */
  async getCategories(): Promise<{ category: ServiceCategory; count: number }[]> {
    const response = await this.http.get<{ categories: { category: ServiceCategory; count: number }[] }>(
      '/api/v1/mcp/services/categories'
    );
    return response.data.categories;
  }

  /**
   * Get featured/popular services
   */
  async getFeatured(): Promise<MCPService[]> {
    const response = await this.http.get<{ services: MCPService[] }>(
      '/api/v1/mcp/services/featured'
    );
    return response.data.services.map(s => snakeToCamel(s as any));
  }

  /**
   * Check if a service requires any specific setup or approval
   */
  async getRequirements(serviceKey: string): Promise<{
    requiresApproval: boolean;
    requiredFields: string[];
    documentation?: string;
  }> {
    const service = await this.get(serviceKey);
    return {
      requiresApproval: service.requiresApproval,
      requiredFields: service.credentialFields
        .filter(f => f.required)
        .map(f => f.key),
      documentation: service.documentationUrl,
    };
  }
}
