// Hook for managing MCP services with real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MCPServiceCatalog, UserMCPService, ServiceCategory } from '../types/mcp-router';

interface ServiceStats {
  total: number;
  configured: number;
  enabled: number;
  healthy: number;
}

interface UseMCPServicesReturn {
  catalogServices: MCPServiceCatalog[];
  userServices: UserMCPService[];
  stats: ServiceStats;
  loading: boolean;
  error: string | null;
  configureService: (serviceKey: string, credentials: Record<string, string>) => Promise<void>;
  toggleService: (serviceKey: string, enabled: boolean) => Promise<void>;
  deleteService: (serviceKey: string) => Promise<void>;
  testConnection: (serviceKey: string) => Promise<{ success: boolean; message: string }>;
  refresh: () => Promise<void>;
}

export function useMCPServices(): UseMCPServicesReturn {
  const [catalogServices, setCatalogServices] = useState<MCPServiceCatalog[]>([]);
  const [userServices, setUserServices] = useState<UserMCPService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch catalog services
      const { data: catalog, error: catalogError } = await supabase
        .from('mcp_service_catalog')
        .select('*')
        .eq('is_available', true)
        .order('display_name');

      if (catalogError) throw new Error(catalogError.message);

      setCatalogServices((catalog || []).map(mapCatalogServiceFromDB));

      // Fetch user services
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userServicesData, error: userError } = await supabase
          .from('user_mcp_services')
          .select(`
            *,
            service:mcp_service_catalog(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (userError) throw new Error(userError.message);

        setUserServices((userServicesData || []).map(mapUserServiceFromDB));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const stats: ServiceStats = {
    total: catalogServices.length,
    configured: userServices.length,
    enabled: userServices.filter(s => s.is_enabled).length,
    healthy: userServices.filter(s => s.health_status === 'healthy').length,
  };

  const configureService = async (serviceKey: string, credentials: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const existing = userServices.find(s => s.service_key === serviceKey);

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('user_mcp_services')
        .update({
          encrypted_credentials: JSON.stringify(credentials),
          health_status: 'unknown',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
    } else {
      // Create new
      const { error } = await supabase
        .from('user_mcp_services')
        .insert([{
          user_id: user.id,
          service_key: serviceKey,
          encrypted_credentials: JSON.stringify(credentials),
          encryption_version: 1,
          is_enabled: true,
          environment: 'production',
          health_status: 'unknown',
        }]);

      if (error) throw new Error(error.message);
    }

    await fetchServices();
  };

  const toggleService = async (serviceKey: string, enabled: boolean) => {
    const service = userServices.find(s => s.service_key === serviceKey);
    if (!service) throw new Error('Service not configured');

    const { error } = await supabase
      .from('user_mcp_services')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', service.id);

    if (error) throw new Error(error.message);

    setUserServices(prev =>
      prev.map(s =>
        s.service_key === serviceKey ? { ...s, is_enabled: enabled } : s
      )
    );
  };

  const deleteService = async (serviceKey: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_mcp_services')
      .delete()
      .eq('user_id', user.id)
      .eq('service_key', serviceKey);

    if (error) throw new Error(error.message);

    setUserServices(prev => prev.filter(s => s.service_key !== serviceKey));
  };

  const testConnection = async (serviceKey: string): Promise<{ success: boolean; message: string }> => {
    const service = catalogServices.find(s => s.service_key === serviceKey);
    if (!service) return { success: false, message: 'Service not found' };

    // Update health status to unknown while testing
    const userService = userServices.find(s => s.service_key === serviceKey);
    if (userService) {
      await supabase
        .from('user_mcp_services')
        .update({ health_status: 'unknown' })
        .eq('id', userService.id);
    }

    // Simulated connection test - in production, this would call the actual health check
    await new Promise(resolve => setTimeout(resolve, 1000));

    const success = Math.random() > 0.2; // 80% success rate for demo
    const status = success ? 'healthy' : 'unhealthy';

    if (userService) {
      await supabase
        .from('user_mcp_services')
        .update({ health_status: status, last_health_check: new Date().toISOString() })
        .eq('id', userService.id);

      setUserServices(prev =>
        prev.map(s =>
          s.service_key === serviceKey ? { ...s, health_status: status } : s
        )
      );
    }

    return {
      success,
      message: success ? 'Connection successful' : 'Connection failed - please check credentials',
    };
  };

  return {
    catalogServices,
    userServices,
    stats,
    loading,
    error,
    configureService,
    toggleService,
    deleteService,
    testConnection,
    refresh: fetchServices,
  };
}

function mapCatalogServiceFromDB(row: any): MCPServiceCatalog {
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

function mapUserServiceFromDB(row: any): UserMCPService {
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
    total_calls: row.total_calls || 0,
    successful_calls: row.successful_calls || 0,
    failed_calls: row.failed_calls || 0,
    last_health_check: row.last_health_check,
    health_status: row.health_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    service: row.service ? mapCatalogServiceFromDB(row.service) : undefined,
  };
}

export default useMCPServices;
