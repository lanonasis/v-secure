// Unit tests for RouterClient

import { RouterClient } from '../client/router';
import type { HTTPAdapter, HTTPResponse } from '../types';

// Mock HTTP adapter
const createMockHTTPAdapter = (mockResponse: any): HTTPAdapter => ({
  get: jest.fn().mockResolvedValue({ data: mockResponse, status: 200, headers: {} }),
  post: jest.fn().mockResolvedValue({ data: mockResponse, status: 200, headers: {} }),
  put: jest.fn().mockResolvedValue({ data: mockResponse, status: 200, headers: {} }),
  delete: jest.fn().mockResolvedValue({ data: mockResponse, status: 200, headers: {} }),
});

describe('RouterClient', () => {
  describe('execute', () => {
    it('should execute a request and return response', async () => {
      const mockResponse = {
        success: true,
        data: { customer: { id: 'cus_123' } },
        meta: {
          requestId: 'req_123',
          responseTimeMs: 150,
        }
      };

      const http = createMockHTTPAdapter(mockResponse);
      const router = new RouterClient({ http });

      const result = await router.execute({
        service: 'stripe',
        action: 'customers.retrieve',
        params: { id: 'cus_123' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ customer: { id: 'cus_123' } });
      expect(http.post).toHaveBeenCalledWith(
        '/api/v1/mcp/router/execute',
        expect.objectContaining({
          service: 'stripe',
          action: 'customers.retrieve',
        })
      );
    });

    it('should emit rate limit warning when remaining is low', async () => {
      const mockResponse = {
        success: true,
        data: {},
        meta: {
          requestId: 'req_123',
          rateLimitRemaining: 5,
          rateLimitReset: '2024-01-01T00:00:00Z'
        }
      };

      const http = createMockHTTPAdapter(mockResponse);
      const events = {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        onAll: jest.fn(),
        clear: jest.fn()
      };
      const router = new RouterClient({ http, events: events as any });

      await router.execute({ service: 'stripe', action: 'test' });

      expect(events.emit).toHaveBeenCalledWith('rate_limit.warning', expect.any(Object));
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple requests in parallel', async () => {
      const mockResponse = {
        success: true,
        data: {},
        meta: { requestId: 'req_123' }
      };

      const http = createMockHTTPAdapter(mockResponse);
      const router = new RouterClient({ http });

      const results = await router.executeBatch([
        { service: 'stripe', action: 'test1' },
        { service: 'github', action: 'test2' },
      ]);

      expect(results).toHaveLength(2);
      expect(http.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeWithRetry', () => {
    it('should retry on 500 errors', async () => {
      const http = createMockHTTPAdapter({});
      let callCount = 0;

      http.post = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject({ status: 500, message: 'Server error' });
        }
        return Promise.resolve({
          data: { success: true, data: {}, meta: {} },
          status: 200,
          headers: {}
        });
      });

      const router = new RouterClient({ http });

      const result = await router.executeWithRetry(
        { service: 'stripe', action: 'test' },
        { maxRetries: 3, retryDelayMs: 10 }
      );

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should not retry on 400 errors', async () => {
      const http = createMockHTTPAdapter({});
      http.post = jest.fn().mockRejectedValue({ status: 400, message: 'Bad request' });

      const router = new RouterClient({ http });

      await expect(
        router.executeWithRetry(
          { service: 'stripe', action: 'test' },
          { maxRetries: 3, retryDelayMs: 10 }
        )
      ).rejects.toEqual({ status: 400, message: 'Bad request' });

      expect(http.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('convenience methods', () => {
    it('get() should execute and return data', async () => {
      const mockResponse = {
        success: true,
        data: { items: [1, 2, 3] },
        meta: {}
      };

      const http = createMockHTTPAdapter(mockResponse);
      const router = new RouterClient({ http });

      const result = await router.get('stripe', 'customers.list', { limit: 10 });

      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('post() should execute and return data', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'created_123' },
        meta: {}
      };

      const http = createMockHTTPAdapter(mockResponse);
      const router = new RouterClient({ http });

      const result = await router.post('stripe', 'customers.create', { email: 'test@test.com' });

      expect(result).toEqual({ id: 'created_123' });
    });

    it('should throw on unsuccessful response', async () => {
      const mockResponse = {
        success: false,
        error: { message: 'Customer not found' },
        meta: {}
      };

      const http = createMockHTTPAdapter(mockResponse);
      const router = new RouterClient({ http });

      await expect(
        router.get('stripe', 'customers.retrieve', { id: 'invalid' })
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('getRateLimits', () => {
    it('should fetch rate limit status', async () => {
      const mockResponse = {
        global: {
          limit: 1000,
          remaining: 950,
          resetAt: '2024-01-01T00:00:00Z'
        },
        perService: {
          stripe: { limit: 100, remaining: 95, resetAt: '2024-01-01T00:00:00Z' }
        }
      };

      const http = createMockHTTPAdapter(mockResponse);
      const router = new RouterClient({ http });

      const result = await router.getRateLimits();

      expect(result.global.limit).toBe(1000);
      expect(http.get).toHaveBeenCalledWith('/api/v1/mcp/router/rate-limits');
    });

    it('should filter by service when provided', async () => {
      const http = createMockHTTPAdapter({ global: {}, perService: {} });
      const router = new RouterClient({ http });

      await router.getRateLimits('stripe');

      expect(http.get).toHaveBeenCalledWith('/api/v1/mcp/router/rate-limits?service=stripe');
    });
  });
});
