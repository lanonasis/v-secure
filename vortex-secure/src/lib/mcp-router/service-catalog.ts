// MCP Router - Service Catalog Manager
// Tier 1: Platform-level service catalog management

import { supabase } from '../supabase';
import type {
  MCPServiceCatalog,
  ServiceCategory,
  CredentialField,
  ServiceCatalogFilters,
} from '../../types/mcp-router';

export class ServiceCatalogManager {
  /**
   * Get all available services from the catalog
   */
  static async getServices(
    filters?: ServiceCatalogFilters
  ): Promise<MCPServiceCatalog[]> {
    let query = supabase
      .from('mcp_service_catalog')
      .select('*')
      .eq('is_available', true)
      .order('display_name');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.or(
        `display_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,service_key.ilike.%${filters.search}%`
      );
    }

    if (!filters?.showBeta) {
      query = query.eq('is_beta', false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch services: ${error.message}`);
    }

    return (data || []).map(this.mapServiceFromDB);
  }

  /**
   * Get a single service by key
   */
  static async getServiceByKey(
    serviceKey: string
  ): Promise<MCPServiceCatalog | null> {
    const { data, error } = await supabase
      .from('mcp_service_catalog')
      .select('*')
      .eq('service_key', serviceKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch service: ${error.message}`);
    }

    return this.mapServiceFromDB(data);
  }

  /**
   * Get services by category
   */
  static async getServicesByCategory(
    category: ServiceCategory
  ): Promise<MCPServiceCatalog[]> {
    return this.getServices({ category });
  }

  /**
   * Get all service categories with counts
   */
  static async getCategoryCounts(): Promise<
    Record<ServiceCategory, number>
  > {
    const { data, error } = await supabase
      .from('mcp_service_catalog')
      .select('category')
      .eq('is_available', true);

    if (error) {
      throw new Error(`Failed to fetch category counts: ${error.message}`);
    }

    const counts: Record<string, number> = {
      payment: 0,
      devops: 0,
      ai: 0,
      communication: 0,
      storage: 0,
      analytics: 0,
      other: 0,
    };

    for (const row of data || []) {
      if (row.category in counts) {
        counts[row.category]++;
      }
    }

    return counts as Record<ServiceCategory, number>;
  }

  /**
   * Validate credentials against service schema
   */
  static validateCredentials(
    service: MCPServiceCatalog,
    credentials: Record<string, string>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of service.credential_fields) {
      const value = credentials[field.key];

      if (field.required && (!value || value.trim() === '')) {
        errors.push(`${field.label} is required`);
        continue;
      }

      if (value && field.validation) {
        if (
          field.validation.minLength &&
          value.length < field.validation.minLength
        ) {
          errors.push(
            `${field.label} must be at least ${field.validation.minLength} characters`
          );
        }

        if (
          field.validation.maxLength &&
          value.length > field.validation.maxLength
        ) {
          errors.push(
            `${field.label} must be at most ${field.validation.maxLength} characters`
          );
        }

        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`${field.label} has an invalid format`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get the credential field schema for a service
   */
  static getCredentialFields(
    service: MCPServiceCatalog
  ): CredentialField[] {
    return service.credential_fields;
  }

  /**
   * Get MCP command for spawning the server
   */
  static getMCPCommand(service: MCPServiceCatalog): {
    command: string;
    args: string[];
    envMapping: Record<string, string>;
  } {
    return {
      command: service.mcp_command || '',
      args: service.mcp_args || [],
      envMapping: service.mcp_env_mapping || {},
    };
  }

  /**
   * Get service icon component name
   */
  static getIconName(service: MCPServiceCatalog): string {
    return service.icon || 'box';
  }

  /**
   * Get category display info
   */
  static getCategoryInfo(category: ServiceCategory): {
    label: string;
    color: string;
    icon: string;
  } {
    const categoryMap: Record<
      ServiceCategory,
      { label: string; color: string; icon: string }
    > = {
      payment: { label: 'Payment', color: 'green', icon: 'credit-card' },
      devops: { label: 'DevOps', color: 'blue', icon: 'git-branch' },
      ai: { label: 'AI', color: 'purple', icon: 'brain' },
      communication: {
        label: 'Communication',
        color: 'yellow',
        icon: 'message-square',
      },
      storage: { label: 'Storage', color: 'orange', icon: 'database' },
      analytics: { label: 'Analytics', color: 'pink', icon: 'bar-chart' },
      other: { label: 'Other', color: 'gray', icon: 'box' },
    };

    return categoryMap[category] || categoryMap.other;
  }

  /**
   * Admin: Add a new service to the catalog
   */
  static async addService(
    service: Omit<MCPServiceCatalog, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MCPServiceCatalog> {
    const { data, error } = await supabase
      .from('mcp_service_catalog')
      .insert([this.mapServiceToDB(service)])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add service: ${error.message}`);
    }

    return this.mapServiceFromDB(data);
  }

  /**
   * Admin: Update a service in the catalog
   */
  static async updateService(
    serviceKey: string,
    updates: Partial<MCPServiceCatalog>
  ): Promise<MCPServiceCatalog> {
    const { data, error } = await supabase
      .from('mcp_service_catalog')
      .update(this.mapServiceToDB(updates))
      .eq('service_key', serviceKey)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update service: ${error.message}`);
    }

    return this.mapServiceFromDB(data);
  }

  /**
   * Admin: Disable a service
   */
  static async disableService(serviceKey: string): Promise<void> {
    const { error } = await supabase
      .from('mcp_service_catalog')
      .update({ is_available: false })
      .eq('service_key', serviceKey);

    if (error) {
      throw new Error(`Failed to disable service: ${error.message}`);
    }
  }

  // Helper: Map database row to typed object
  private static mapServiceFromDB(row: any): MCPServiceCatalog {
    return {
      id: row.id,
      service_key: row.service_key,
      display_name: row.display_name,
      description: row.description,
      icon: row.icon,
      category: row.category,
      credential_fields: row.credential_fields || [],
      mcp_command: row.mcp_command,
      mcp_args: row.mcp_args || [],
      mcp_env_mapping: row.mcp_env_mapping || {},
      documentation_url: row.documentation_url,
      base_url: row.base_url,
      health_check_endpoint: row.health_check_endpoint,
      is_available: row.is_available,
      is_beta: row.is_beta,
      requires_approval: row.requires_approval,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Helper: Map typed object to database row
  private static mapServiceToDB(
    service: Partial<MCPServiceCatalog>
  ): Record<string, any> {
    const mapped: Record<string, any> = {};

    if (service.service_key !== undefined)
      mapped.service_key = service.service_key;
    if (service.display_name !== undefined)
      mapped.display_name = service.display_name;
    if (service.description !== undefined)
      mapped.description = service.description;
    if (service.icon !== undefined) mapped.icon = service.icon;
    if (service.category !== undefined) mapped.category = service.category;
    if (service.credential_fields !== undefined)
      mapped.credential_fields = service.credential_fields;
    if (service.mcp_command !== undefined)
      mapped.mcp_command = service.mcp_command;
    if (service.mcp_args !== undefined) mapped.mcp_args = service.mcp_args;
    if (service.mcp_env_mapping !== undefined)
      mapped.mcp_env_mapping = service.mcp_env_mapping;
    if (service.documentation_url !== undefined)
      mapped.documentation_url = service.documentation_url;
    if (service.base_url !== undefined) mapped.base_url = service.base_url;
    if (service.health_check_endpoint !== undefined)
      mapped.health_check_endpoint = service.health_check_endpoint;
    if (service.is_available !== undefined)
      mapped.is_available = service.is_available;
    if (service.is_beta !== undefined) mapped.is_beta = service.is_beta;
    if (service.requires_approval !== undefined)
      mapped.requires_approval = service.requires_approval;

    return mapped;
  }
}

export default ServiceCatalogManager;
