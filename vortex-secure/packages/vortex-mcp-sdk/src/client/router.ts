// MCP Router Client - Route requests to configured MCP services

import type {
  HTTPAdapter,
  RouterRequest,
  RouterResponse,
  RateLimitInfo,
  ServiceEnvironment,
} from '../types';
import { VortexEventEmitter } from '../utils/event-emitter';
import { generateRequestId, snakeToCamel } from '../utils';

export interface RouterClientOptions {
  http: HTTPAdapter;
  events?: VortexEventEmitter;
  defaultEnvironment?: ServiceEnvironment;
}

/**
 * MCP Router Client
 * Route requests to external APIs through configured MCP services
 */
export class RouterClient {
  private http: HTTPAdapter;
  private events?: VortexEventEmitter;
  public readonly defaultEnvironment: ServiceEnvironment;

  constructor(options: RouterClientOptions) {
    this.http = options.http;
    this.events = options.events;
    this.defaultEnvironment = options.defaultEnvironment || 'production';
  }

  /**
   * Execute a request through the MCP router
   */
  async execute<T = unknown>(request: RouterRequest): Promise<RouterResponse<T>> {
    const startTime = Date.now();
    const requestId = generateRequestId();

    try {
      const response = await this.http.post<RouterResponse<T>>(
        '/api/v1/mcp/router/execute',
        {
          ...request,
          request_id: requestId,
        }
      );

      const result = snakeToCamel(response.data as any) as RouterResponse<T>;

      // Emit rate limit warning if approaching limits
      if (result.meta.rateLimitRemaining !== undefined && result.meta.rateLimitRemaining < 10) {
        this.events?.emit('rate_limit.warning', {
          service: request.service,
          remaining: result.meta.rateLimitRemaining,
          resetAt: result.meta.rateLimitReset,
        });
      }

      return result;
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;

      // Handle rate limit errors
      if (error.status === 429) {
        this.events?.emit('rate_limit.exceeded', {
          service: request.service,
          action: request.action,
        });
      }

      // Emit error event
      this.events?.emit('error', {
        requestId,
        service: request.service,
        action: request.action,
        error: error.message,
        responseTimeMs,
      });

      throw error;
    }
  }

  /**
   * Execute multiple requests in parallel
   */
  async executeBatch<T = unknown>(
    requests: RouterRequest[]
  ): Promise<RouterResponse<T>[]> {
    return Promise.all(requests.map(req => this.execute<T>(req)));
  }

  /**
   * Execute a request with automatic retry on transient failures
   */
  async executeWithRetry<T = unknown>(
    request: RouterRequest,
    options?: {
      maxRetries?: number;
      retryDelayMs?: number;
    }
  ): Promise<RouterResponse<T>> {
    const { maxRetries = 3, retryDelayMs = 1000 } = options || {};
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute<T>(request);
      } catch (error: any) {
        lastError = error;

        // Don't retry on auth, rate limit, or client errors
        if (error.status && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, retryDelayMs * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Stream a request for services that support streaming
   */
  async *stream<T = unknown>(
    request: RouterRequest
  ): AsyncGenerator<T, void, unknown> {
    const response = await this.http.post<ReadableStream>(
      '/api/v1/mcp/router/stream',
      {
        ...request,
        request_id: generateRequestId(),
      }
    );

    const reader = (response.data as any).getReader?.();
    if (!reader) {
      throw new Error('Streaming not supported in this environment');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            yield data as T;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimits(serviceKey?: string): Promise<{
    global: RateLimitInfo;
    perService?: Record<string, RateLimitInfo>;
  }> {
    const params = serviceKey ? `?service=${serviceKey}` : '';
    const response = await this.http.get<{
      global: RateLimitInfo;
      perService?: Record<string, RateLimitInfo>;
    }>(`/api/v1/mcp/router/rate-limits${params}`);
    return snakeToCamel(response.data as any);
  }

  // =============================================
  // Convenience methods for common service patterns
  // =============================================

  /**
   * Execute a GET-like action
   */
  async get<T = unknown>(
    service: string,
    action: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const response = await this.execute<T>({
      service,
      action,
      params,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Request failed');
    }

    return response.data as T;
  }

  /**
   * Execute a POST-like action
   */
  async post<T = unknown>(
    service: string,
    action: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    const response = await this.execute<T>({
      service,
      action,
      params,
      body,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Request failed');
    }

    return response.data as T;
  }

  /**
   * Execute a request and return the full response
   */
  async call<T = unknown>(
    service: string,
    action: string,
    options?: {
      params?: Record<string, unknown>;
      body?: unknown;
      headers?: Record<string, string>;
    }
  ): Promise<RouterResponse<T>> {
    return this.execute<T>({
      service,
      action,
      params: options?.params,
      body: options?.body,
      headers: options?.headers,
    });
  }
}
