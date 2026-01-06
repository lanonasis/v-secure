// MCP Router - User Service Configuration Manager
// Tier 2: User-level service configuration with encrypted credentials

import { supabase } from '../supabase';
import { VortexEncryption } from '../encryption';
import type {
  UserMCPService,
  MCPServiceCatalog,
  ServiceCredentials,
  ServiceEnvironment,
  HealthStatus,
  ConfigureServiceRequest,
  TestConnectionResult,
} from '../../types/mcp-router';
import { ServiceCatalogManager } from './service-catalog';

export class UserServicesManager {
  private masterPassword: string;

  constructor(masterPassword: string) {
    this.masterPassword = masterPassword;
  }

  /**
   * Get all services configured by the current user
   */
  async getUserServices(): Promise<UserMCPService[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_mcp_services')
      .select(`
        *,
        service:mcp_service_catalog(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user services: ${error.message}`);
    }

    return (data || []).map(this.mapUserServiceFromDB);
  }

  /**
   * Get enabled services only
   */
  async getEnabledServices(): Promise<UserMCPService[]> {
    const services = await this.getUserServices();
    return services.filter(s => s.is_enabled);
  }

  /**
   * Get a specific user service configuration
   */
  async getUserService(
    serviceKey: string,
    environment: ServiceEnvironment = 'production'
  ): Promise<UserMCPService | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_mcp_services')
      .select(`
        *,
        service:mcp_service_catalog(*)
      `)
      .eq('user_id', user.id)
      .eq('service_key', serviceKey)
      .eq('environment', environment)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch service: ${error.message}`);
    }

    return this.mapUserServiceFromDB(data);
  }

  /**
   * Check if a service is configured for the user
   */
  async isServiceConfigured(
    serviceKey: string,
    environment: ServiceEnvironment = 'production'
  ): Promise<boolean> {
    const service = await this.getUserService(serviceKey, environment);
    return service !== null;
  }

  /**
   * Configure a new service (or update existing)
   */
  async configureService(
    request: ConfigureServiceRequest
  ): Promise<UserMCPService> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate service exists
    const catalogService = await ServiceCatalogManager.getServiceByKey(
      request.service_key
    );
    if (!catalogService) {
      throw new Error(`Service '${request.service_key}' not found`);
    }

    // Validate credentials
    const validation = ServiceCatalogManager.validateCredentials(
      catalogService,
      request.credentials
    );
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }

    // Encrypt credentials
    const credentialsJson = JSON.stringify(request.credentials);
    const encryptedCredentials = await VortexEncryption.encrypt(
      credentialsJson,
      this.masterPassword
    );

    const environment = request.environment || 'production';

    // Check if already exists
    const existing = await this.getUserService(
      request.service_key,
      environment
    );

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('user_mcp_services')
        .update({
          encrypted_credentials: encryptedCredentials,
          alias: request.alias,
          is_enabled: request.is_enabled ?? true,
          health_status: 'unknown',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(`
          *,
          service:mcp_service_catalog(*)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update service: ${error.message}`);
      }

      return this.mapUserServiceFromDB(data);
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('user_mcp_services')
        .insert([
          {
            user_id: user.id,
            service_key: request.service_key,
            encrypted_credentials: encryptedCredentials,
            encryption_version: 1,
            is_enabled: request.is_enabled ?? true,
            alias: request.alias,
            environment,
            health_status: 'unknown',
          },
        ])
        .select(`
          *,
          service:mcp_service_catalog(*)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to configure service: ${error.message}`);
      }

      return this.mapUserServiceFromDB(data);
    }
  }

  /**
   * Update service credentials
   */
  async updateCredentials(
    serviceKey: string,
    credentials: Record<string, string>,
    environment: ServiceEnvironment = 'production'
  ): Promise<UserMCPService> {
    const existing = await this.getUserService(serviceKey, environment);
    if (!existing) {
      throw new Error(`Service '${serviceKey}' not configured`);
    }

    // Get catalog service for validation
    const catalogService = await ServiceCatalogManager.getServiceByKey(
      serviceKey
    );
    if (!catalogService) {
      throw new Error(`Service '${serviceKey}' not found in catalog`);
    }

    // Validate credentials
    const validation = ServiceCatalogManager.validateCredentials(
      catalogService,
      credentials
    );
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }

    // Encrypt new credentials
    const credentialsJson = JSON.stringify(credentials);
    const encryptedCredentials = await VortexEncryption.encrypt(
      credentialsJson,
      this.masterPassword
    );

    const { data, error } = await supabase
      .from('user_mcp_services')
      .update({
        encrypted_credentials: encryptedCredentials,
        health_status: 'unknown',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(`
        *,
        service:mcp_service_catalog(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update credentials: ${error.message}`);
    }

    return this.mapUserServiceFromDB(data);
  }

  /**
   * Toggle service enabled/disabled
   */
  async toggleService(
    serviceKey: string,
    enabled: boolean,
    environment: ServiceEnvironment = 'production'
  ): Promise<UserMCPService> {
    const existing = await this.getUserService(serviceKey, environment);
    if (!existing) {
      throw new Error(`Service '${serviceKey}' not configured`);
    }

    const { data, error } = await supabase
      .from('user_mcp_services')
      .update({
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(`
        *,
        service:mcp_service_catalog(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to toggle service: ${error.message}`);
    }

    return this.mapUserServiceFromDB(data);
  }

  /**
   * Delete a service configuration
   */
  async deleteService(
    serviceKey: string,
    environment: ServiceEnvironment = 'production'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_mcp_services')
      .delete()
      .eq('user_id', user.id)
      .eq('service_key', serviceKey)
      .eq('environment', environment);

    if (error) {
      throw new Error(`Failed to delete service: ${error.message}`);
    }
  }

  /**
   * Get decrypted credentials for a service (internal use only)
   */
  async getDecryptedCredentials(
    serviceKey: string,
    environment: ServiceEnvironment = 'production'
  ): Promise<ServiceCredentials> {
    const service = await this.getUserService(serviceKey, environment);
    if (!service) {
      throw new Error(`Service '${serviceKey}' not configured`);
    }

    if (!service.is_enabled) {
      throw new Error(`Service '${serviceKey}' is disabled`);
    }

    try {
      const decryptedJson = await VortexEncryption.decrypt(
        service.encrypted_credentials,
        this.masterPassword
      );
      return JSON.parse(decryptedJson);
    } catch (error: any) {
      throw new Error(
        `Failed to decrypt credentials: ${error.message}`
      );
    }
  }

  /**
   * Test connection to a service
   */
  async testConnection(
    serviceKey: string,
    credentials?: Record<string, string>,
    environment: ServiceEnvironment = 'production'
  ): Promise<TestConnectionResult> {
    const startTime = Date.now();

    try {
      // Get catalog service
      const catalogService = await ServiceCatalogManager.getServiceByKey(
        serviceKey
      );
      if (!catalogService) {
        return {
          success: false,
          message: `Service '${serviceKey}' not found`,
        };
      }

      // Use provided credentials or get from storage
      let creds: ServiceCredentials;
      if (credentials) {
        creds = credentials;
      } else {
        try {
          creds = await this.getDecryptedCredentials(
            serviceKey,
            environment
          );
        } catch (e) {
          return {
            success: false,
            message: 'No credentials configured for this service',
          };
        }
      }

      // Test connection based on service type
      const result = await this.performConnectionTest(
        catalogService,
        creds
      );

      const responseTime = Date.now() - startTime;

      if (result.success) {
        // Update health status
        await this.updateHealthStatus(
          serviceKey,
          'healthy',
          environment
        );
      } else {
        await this.updateHealthStatus(
          serviceKey,
          'unhealthy',
          environment
        );
      }

      return {
        ...result,
        response_time_ms: responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: error.message,
        response_time_ms: responseTime,
      };
    }
  }

  /**
   * Perform actual connection test
   */
  private async performConnectionTest(
    service: MCPServiceCatalog,
    credentials: ServiceCredentials
  ): Promise<TestConnectionResult> {
    // If no health check endpoint, just validate credentials format
    if (!service.health_check_endpoint || !service.base_url) {
      return {
        success: true,
        message: 'Credentials saved (no connection test available)',
      };
    }

    // Build the health check URL
    const url = `${service.base_url}${service.health_check_endpoint}`;

    // Build headers based on service type
    const headers = this.buildAuthHeaders(service, credentials);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful',
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'Authentication failed - please check your credentials',
        };
      } else {
        return {
          success: false,
          message: `Connection failed with status ${response.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  /**
   * Build authentication headers for a service
   */
  private buildAuthHeaders(
    service: MCPServiceCatalog,
    credentials: ServiceCredentials
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Common patterns for different services
    switch (service.service_key) {
      case 'stripe':
        if (credentials.secret_key) {
          headers['Authorization'] = `Bearer ${credentials.secret_key}`;
        }
        break;
      case 'github':
        if (credentials.token) {
          headers['Authorization'] = `Bearer ${credentials.token}`;
        }
        break;
      case 'openai':
        if (credentials.api_key) {
          headers['Authorization'] = `Bearer ${credentials.api_key}`;
        }
        if (credentials.organization) {
          headers['OpenAI-Organization'] = credentials.organization;
        }
        break;
      case 'anthropic':
        if (credentials.api_key) {
          headers['x-api-key'] = credentials.api_key;
          headers['anthropic-version'] = '2023-06-01';
        }
        break;
      case 'slack':
        if (credentials.bot_token) {
          headers['Authorization'] = `Bearer ${credentials.bot_token}`;
        }
        break;
      case 'notion':
        if (credentials.api_key) {
          headers['Authorization'] = `Bearer ${credentials.api_key}`;
          headers['Notion-Version'] = '2022-06-28';
        }
        break;
      default:
        // Generic Bearer token
        const token =
          credentials.api_key ||
          credentials.token ||
          credentials.secret_key;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
  }

  /**
   * Update health status
   */
  private async updateHealthStatus(
    serviceKey: string,
    status: HealthStatus,
    environment: ServiceEnvironment
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_mcp_services')
      .update({
        health_status: status,
        last_health_check: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('service_key', serviceKey)
      .eq('environment', environment);
  }

  /**
   * Get service usage statistics
   */
  async getServiceStats(
    serviceKey: string,
    environment: ServiceEnvironment = 'production'
  ): Promise<{
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    last_used_at?: string;
  }> {
    const service = await this.getUserService(serviceKey, environment);
    if (!service) {
      return {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
      };
    }

    return {
      total_calls: service.total_calls,
      successful_calls: service.successful_calls,
      failed_calls: service.failed_calls,
      last_used_at: service.last_used_at,
    };
  }

  /**
   * Get all services with their catalog info merged
   */
  async getServicesWithCatalog(): Promise<{
    configured: UserMCPService[];
    available: MCPServiceCatalog[];
  }> {
    const [configured, allServices] = await Promise.all([
      this.getUserServices(),
      ServiceCatalogManager.getServices(),
    ]);

    const configuredKeys = new Set(configured.map(s => s.service_key));
    const available = allServices.filter(
      s => !configuredKeys.has(s.service_key)
    );

    return { configured, available };
  }

  // Helper: Map database row to typed object
  private mapUserServiceFromDB(row: any): UserMCPService {
    return {
      id: row.id,
      user_id: row.user_id,
      service_key: row.service_key,
      encrypted_credentials: row.encrypted_credentials,
      encryption_key_id: row.encryption_key_id,
      encryption_version: row.encryption_version,
      is_enabled: row.is_enabled,
      alias: row.alias,
      environment: row.environment,
      last_used_at: row.last_used_at,
      total_calls: row.total_calls,
      successful_calls: row.successful_calls,
      failed_calls: row.failed_calls,
      last_health_check: row.last_health_check,
      health_status: row.health_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      service: row.service
        ? {
            id: row.service.id,
            service_key: row.service.service_key,
            display_name: row.service.display_name,
            description: row.service.description,
            icon: row.service.icon,
            category: row.service.category,
            credential_fields: row.service.credential_fields || [],
            mcp_command: row.service.mcp_command,
            mcp_args: row.service.mcp_args || [],
            mcp_env_mapping: row.service.mcp_env_mapping || {},
            documentation_url: row.service.documentation_url,
            base_url: row.service.base_url,
            health_check_endpoint: row.service.health_check_endpoint,
            is_available: row.service.is_available,
            is_beta: row.service.is_beta,
            requires_approval: row.service.requires_approval,
            created_at: row.service.created_at,
            updated_at: row.service.updated_at,
          }
        : undefined,
    };
  }
}

export default UserServicesManager;
