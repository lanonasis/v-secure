// MCP Router - Core Routing Engine
// Main router for handling external API requests

import { supabase } from '../supabase';
import type {
  MCPRouterRequest,
  MCPRouterResponse,
  MCPUsageLog,
  ServiceEnvironment,
  MCPRouterErrorCode,
} from '../../types/mcp-router';
import { MCPRouterErrors } from '../../types/mcp-router';
import { ServiceCatalogManager } from './service-catalog';
import { UserServicesManager } from './user-services';
import { APIKeyManager } from './api-keys';
import { MCPProcessPool } from './process-pool';

export interface RouterContext {
  apiKey: string;
  clientIP?: string;
  userAgent?: string;
  origin?: string;
  environment?: ServiceEnvironment;
}

export class MCPRouter {
  private processPool: MCPProcessPool;
  private masterPassword: string;

  constructor(masterPassword: string) {
    this.masterPassword = masterPassword;
    this.processPool = new MCPProcessPool(masterPassword);
  }

  /**
   * Main routing method - handles external API requests
   * POST /api/v1/mcp/{service}/{action}
   */
  async route(
    request: MCPRouterRequest,
    context: RouterContext
  ): Promise<MCPRouterResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let userId: string | undefined;
    let apiKeyId: string | undefined;

    try {
      // Step 1: Validate API key
      const apiKeyManager = new APIKeyManager(this.masterPassword);
      const keyValidation = await apiKeyManager.validateAPIKey(context.apiKey);

      if (!keyValidation.valid) {
        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.INVALID_API_KEY,
          keyValidation.error || 'Invalid API key'
        );
      }

      userId = keyValidation.user_id;
      apiKeyId = keyValidation.api_key?.id;
      const environment = context.environment || 'production';

      // Step 2: Check IP whitelist
      if (context.clientIP && apiKeyId) {
        const ipCheck = await apiKeyManager.checkIPAccess(
          apiKeyId,
          context.clientIP
        );
        if (!ipCheck.allowed) {
          await this.logUsage({
            request_id: requestId,
            user_id: userId!,
            api_key_id: apiKeyId,
            service_key: request.service,
            action: request.action,
            status: 'unauthorized',
            error_code: MCPRouterErrors.IP_NOT_ALLOWED,
            error_message: ipCheck.reason,
            client_ip: context.clientIP,
            user_agent: context.userAgent,
            response_time_ms: Date.now() - startTime,
          });

          return this.errorResponse(
            requestId,
            request,
            startTime,
            MCPRouterErrors.IP_NOT_ALLOWED,
            ipCheck.reason || 'IP not allowed'
          );
        }
      }

      // Step 3: Check rate limits
      if (apiKeyId) {
        const rateLimitCheck = await apiKeyManager.checkRateLimit(apiKeyId);
        if (!rateLimitCheck.allowed) {
          const errorCode = rateLimitCheck.minute.remaining === 0
            ? MCPRouterErrors.RATE_LIMIT_EXCEEDED_MINUTE
            : MCPRouterErrors.RATE_LIMIT_EXCEEDED_DAY;

          await this.logUsage({
            request_id: requestId,
            user_id: userId!,
            api_key_id: apiKeyId,
            service_key: request.service,
            action: request.action,
            status: 'rate_limited',
            error_code: errorCode,
            error_message: 'Rate limit exceeded',
            client_ip: context.clientIP,
            user_agent: context.userAgent,
            response_time_ms: Date.now() - startTime,
          });

          return this.errorResponse(
            requestId,
            request,
            startTime,
            errorCode,
            'Rate limit exceeded',
            {
              rate_limit: rateLimitCheck,
            }
          );
        }
      }

      // Step 4: Check service scope access
      if (apiKeyId) {
        const scopeCheck = await apiKeyManager.checkServiceAccess(
          apiKeyId,
          request.service,
          environment
        );
        if (!scopeCheck.allowed) {
          await this.logUsage({
            request_id: requestId,
            user_id: userId!,
            api_key_id: apiKeyId,
            service_key: request.service,
            action: request.action,
            status: 'unauthorized',
            error_code: MCPRouterErrors.SERVICE_NOT_IN_SCOPE,
            error_message: scopeCheck.reason,
            client_ip: context.clientIP,
            user_agent: context.userAgent,
            response_time_ms: Date.now() - startTime,
          });

          return this.errorResponse(
            requestId,
            request,
            startTime,
            MCPRouterErrors.SERVICE_NOT_IN_SCOPE,
            scopeCheck.reason || 'Service not in API key scope'
          );
        }
      }

      // Step 5: Check action access (if specific actions are configured)
      if (apiKeyId) {
        const actionCheck = await apiKeyManager.checkActionAccess(
          apiKeyId,
          request.service,
          request.action
        );
        if (!actionCheck.allowed) {
          await this.logUsage({
            request_id: requestId,
            user_id: userId!,
            api_key_id: apiKeyId,
            service_key: request.service,
            action: request.action,
            status: 'unauthorized',
            error_code: MCPRouterErrors.ACTION_NOT_ALLOWED,
            error_message: actionCheck.reason,
            client_ip: context.clientIP,
            user_agent: context.userAgent,
            response_time_ms: Date.now() - startTime,
          });

          return this.errorResponse(
            requestId,
            request,
            startTime,
            MCPRouterErrors.ACTION_NOT_ALLOWED,
            actionCheck.reason || 'Action not allowed for this API key'
          );
        }
      }

      // Step 6: Check if service exists in catalog
      const catalogService = await ServiceCatalogManager.getServiceByKey(
        request.service
      );
      if (!catalogService) {
        await this.logUsage({
          request_id: requestId,
          user_id: userId!,
          api_key_id: apiKeyId,
          service_key: request.service,
          action: request.action,
          status: 'error',
          error_code: MCPRouterErrors.SERVICE_NOT_FOUND,
          error_message: `Service '${request.service}' not found`,
          client_ip: context.clientIP,
          user_agent: context.userAgent,
          response_time_ms: Date.now() - startTime,
        });

        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.SERVICE_NOT_FOUND,
          `Service '${request.service}' not found`
        );
      }

      if (!catalogService.is_available) {
        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.SERVICE_UNAVAILABLE,
          `Service '${request.service}' is currently unavailable`
        );
      }

      // Step 7: Check if user has configured and enabled the service
      const userServicesManager = new UserServicesManager(this.masterPassword);
      // Note: We need to impersonate the user for this check
      // In a real implementation, this would use a service account
      const userService = await this.getUserServiceByUserId(
        userId!,
        request.service,
        environment
      );

      if (!userService) {
        await this.logUsage({
          request_id: requestId,
          user_id: userId!,
          api_key_id: apiKeyId,
          service_key: request.service,
          action: request.action,
          status: 'error',
          error_code: MCPRouterErrors.SERVICE_NOT_CONFIGURED,
          error_message: `Service '${request.service}' not configured`,
          client_ip: context.clientIP,
          user_agent: context.userAgent,
          response_time_ms: Date.now() - startTime,
        });

        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.SERVICE_NOT_CONFIGURED,
          `Service '${request.service}' not configured for your account`
        );
      }

      if (!userService.is_enabled) {
        await this.logUsage({
          request_id: requestId,
          user_id: userId!,
          api_key_id: apiKeyId,
          service_key: request.service,
          action: request.action,
          status: 'error',
          error_code: MCPRouterErrors.SERVICE_NOT_ENABLED,
          error_message: `Service '${request.service}' is disabled`,
          client_ip: context.clientIP,
          user_agent: context.userAgent,
          response_time_ms: Date.now() - startTime,
        });

        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.SERVICE_NOT_ENABLED,
          `Service '${request.service}' is disabled for your account`
        );
      }

      // Step 8: Decrypt user credentials
      let credentials: Record<string, string>;
      const decryptStart = Date.now();
      try {
        credentials = await this.decryptUserCredentials(
          userService.encrypted_credentials
        );
      } catch (error: any) {
        await this.logUsage({
          request_id: requestId,
          user_id: userId!,
          api_key_id: apiKeyId,
          service_key: request.service,
          action: request.action,
          status: 'error',
          error_code: MCPRouterErrors.CREDENTIAL_DECRYPTION_FAILED,
          error_message: 'Failed to decrypt credentials',
          client_ip: context.clientIP,
          user_agent: context.userAgent,
          response_time_ms: Date.now() - startTime,
        });

        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.CREDENTIAL_DECRYPTION_FAILED,
          'Failed to decrypt service credentials'
        );
      }

      // Step 9: Execute the MCP call via process pool
      const mcpSpawnStart = Date.now();
      let mcpResult: any;
      try {
        mcpResult = await this.processPool.execute(
          userId!,
          request.service,
          catalogService,
          credentials,
          request.action,
          request.params || {}
        );
      } catch (error: any) {
        const mcpSpawnTime = Date.now() - mcpSpawnStart;

        await this.logUsage({
          request_id: requestId,
          user_id: userId!,
          api_key_id: apiKeyId,
          service_key: request.service,
          action: request.action,
          status: 'error',
          error_code: MCPRouterErrors.MCP_CONNECTION_ERROR,
          error_message: error.message,
          client_ip: context.clientIP,
          user_agent: context.userAgent,
          response_time_ms: Date.now() - startTime,
          mcp_spawn_time_ms: mcpSpawnTime,
        });

        return this.errorResponse(
          requestId,
          request,
          startTime,
          MCPRouterErrors.MCP_CONNECTION_ERROR,
          `MCP execution failed: ${error.message}`
        );
      }

      const mcpSpawnTime = Date.now() - mcpSpawnStart;
      const externalApiTime = mcpResult.response_time_ms || 0;

      // Step 10: Increment rate limit counters
      if (apiKeyId) {
        await new APIKeyManager(this.masterPassword).incrementRateLimit(
          apiKeyId
        );
      }

      // Step 11: Log successful usage
      const totalTime = Date.now() - startTime;
      await this.logUsage({
        request_id: requestId,
        user_id: userId!,
        api_key_id: apiKeyId,
        service_key: request.service,
        action: request.action,
        status: 'success',
        response_status: mcpResult.status || 200,
        response_body: this.sanitizeResponse(mcpResult.data),
        client_ip: context.clientIP,
        user_agent: context.userAgent,
        response_time_ms: totalTime,
        mcp_spawn_time_ms: mcpSpawnTime,
        external_api_time_ms: externalApiTime,
      });

      // Step 12: Get rate limit info for response headers
      let rateLimitInfo;
      if (apiKeyId) {
        const rlCheck = await new APIKeyManager(
          this.masterPassword
        ).checkRateLimit(apiKeyId);
        rateLimitInfo = rlCheck.minute;
      }

      // Return success response
      return {
        success: true,
        data: mcpResult.data,
        metadata: {
          request_id: requestId,
          service: request.service,
          action: request.action,
          response_time_ms: totalTime,
          rate_limit: rateLimitInfo,
        },
      };
    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      // Log the error
      if (userId) {
        await this.logUsage({
          request_id: requestId,
          user_id: userId,
          api_key_id: apiKeyId,
          service_key: request.service,
          action: request.action,
          status: 'error',
          error_code: MCPRouterErrors.INTERNAL_ERROR,
          error_message: error.message,
          client_ip: context.clientIP,
          user_agent: context.userAgent,
          response_time_ms: totalTime,
        });
      }

      return this.errorResponse(
        requestId,
        request,
        startTime,
        MCPRouterErrors.INTERNAL_ERROR,
        'An internal error occurred'
      );
    }
  }

  /**
   * Get user service by user ID (service account level access)
   */
  private async getUserServiceByUserId(
    userId: string,
    serviceKey: string,
    environment: ServiceEnvironment
  ): Promise<{
    encrypted_credentials: string;
    is_enabled: boolean;
  } | null> {
    const { data, error } = await supabase
      .from('user_mcp_services')
      .select('encrypted_credentials, is_enabled')
      .eq('user_id', userId)
      .eq('service_key', serviceKey)
      .eq('environment', environment)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Decrypt user credentials
   */
  private async decryptUserCredentials(
    encryptedCredentials: string
  ): Promise<Record<string, string>> {
    const { VortexEncryption } = await import('../encryption');
    const decryptedJson = await VortexEncryption.decrypt(
      encryptedCredentials,
      this.masterPassword
    );
    return JSON.parse(decryptedJson);
  }

  /**
   * Create error response
   */
  private errorResponse(
    requestId: string,
    request: MCPRouterRequest,
    startTime: number,
    code: MCPRouterErrorCode,
    message: string,
    details?: Record<string, any>
  ): MCPRouterResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      metadata: {
        request_id: requestId,
        service: request.service,
        action: request.action,
        response_time_ms: Date.now() - startTime,
      },
    };
  }

  /**
   * Log usage to database
   */
  private async logUsage(
    log: Partial<MCPUsageLog> & {
      request_id: string;
      user_id: string;
      service_key: string;
      action: string;
    }
  ): Promise<void> {
    try {
      await supabase.from('mcp_usage_logs').insert([
        {
          request_id: log.request_id,
          user_id: log.user_id,
          api_key_id: log.api_key_id,
          service_key: log.service_key,
          action: log.action,
          method: log.method || 'POST',
          request_body: log.request_body,
          request_headers: log.request_headers,
          response_status: log.response_status,
          response_body: log.response_body,
          error_message: log.error_message,
          error_code: log.error_code,
          response_time_ms: log.response_time_ms,
          mcp_spawn_time_ms: log.mcp_spawn_time_ms,
          external_api_time_ms: log.external_api_time_ms,
          client_ip: log.client_ip,
          user_agent: log.user_agent,
          origin: log.origin,
          status: log.status || 'pending',
          billable: log.billable ?? true,
          billing_amount_cents: log.billing_amount_cents || 0,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to log usage:', error);
    }
  }

  /**
   * Sanitize response body (remove sensitive data, truncate)
   */
  private sanitizeResponse(data: any): any {
    if (!data) return data;

    const stringified = JSON.stringify(data);
    // Truncate if too large (10KB limit)
    if (stringified.length > 10240) {
      return {
        _truncated: true,
        _size: stringified.length,
        _preview: stringified.substring(0, 1000) + '...',
      };
    }

    return data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      database: boolean;
      process_pool: boolean;
    };
  }> {
    let databaseHealthy = false;
    let processPoolHealthy = false;

    try {
      // Check database connection
      const { error } = await supabase
        .from('mcp_service_catalog')
        .select('service_key')
        .limit(1);
      databaseHealthy = !error;
    } catch (e) {
      databaseHealthy = false;
    }

    try {
      // Check process pool
      processPoolHealthy = await this.processPool.healthCheck();
    } catch (e) {
      processPoolHealthy = false;
    }

    const allHealthy = databaseHealthy && processPoolHealthy;
    const allUnhealthy = !databaseHealthy && !processPoolHealthy;

    return {
      status: allHealthy
        ? 'healthy'
        : allUnhealthy
        ? 'unhealthy'
        : 'degraded',
      details: {
        database: databaseHealthy,
        process_pool: processPoolHealthy,
      },
    };
  }

  /**
   * Get usage analytics for a user
   */
  async getUsageAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    avg_response_time_ms: number;
    by_service: Record<string, number>;
    by_action: Record<string, number>;
    by_day: { date: string; count: number }[];
  }> {
    const { data, error } = await supabase
      .from('mcp_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    const analytics = {
      total_calls: data?.length || 0,
      successful_calls: 0,
      failed_calls: 0,
      avg_response_time_ms: 0,
      by_service: {} as Record<string, number>,
      by_action: {} as Record<string, number>,
      by_day: [] as { date: string; count: number }[],
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    const dayMap = new Map<string, number>();

    for (const log of data || []) {
      if (log.status === 'success') {
        analytics.successful_calls++;
      } else {
        analytics.failed_calls++;
      }

      if (log.response_time_ms) {
        totalResponseTime += log.response_time_ms;
        responseTimeCount++;
      }

      analytics.by_service[log.service_key] =
        (analytics.by_service[log.service_key] || 0) + 1;

      const actionKey = `${log.service_key}:${log.action}`;
      analytics.by_action[actionKey] =
        (analytics.by_action[actionKey] || 0) + 1;

      const dateKey = log.timestamp.split('T')[0];
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1);
    }

    analytics.avg_response_time_ms =
      responseTimeCount > 0
        ? Math.round(totalResponseTime / responseTimeCount)
        : 0;

    analytics.by_day = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return analytics;
  }

  /**
   * Cleanup - shutdown process pool
   */
  async shutdown(): Promise<void> {
    await this.processPool.shutdown();
  }
}

export default MCPRouter;
