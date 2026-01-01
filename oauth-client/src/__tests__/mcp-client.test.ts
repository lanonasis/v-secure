import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock cross-fetch
const mockFetch = vi.fn();
vi.mock('cross-fetch', () => ({
  default: mockFetch
}));
import { MCPClient, MCPClientConfig } from '../client/mcp-client';

describe('MCPClient', () => {
  let client: MCPClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (client) {
      client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      client = new MCPClient();
      expect(client).toBeDefined();
    });

    it('should initialize with API key mode', () => {
      client = new MCPClient({
        apiKey: 'lano_test_key_123'
      });
      expect(client).toBeDefined();
    });

    it('should initialize with OAuth mode when no API key provided', () => {
      client = new MCPClient({
        clientId: 'test_client_id'
      });
      expect(client).toBeDefined();
    });

    it('should accept custom MCP endpoint', () => {
      client = new MCPClient({
        mcpEndpoint: 'wss://custom-mcp.example.com',
        apiKey: 'lano_test'
      });
      expect(client).toBeDefined();
    });

    it('should accept custom token storage', () => {
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn(),
        clear: vi.fn(),
        isTokenExpired: vi.fn()
      };

      client = new MCPClient({
        apiKey: 'lano_test',
        tokenStorage: mockStorage
      });
      expect(client).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should clean up resources on disconnect', () => {
      client = new MCPClient({ apiKey: 'lano_test' });
      
      // Should not throw
      expect(() => client.disconnect()).not.toThrow();
    });

    it('should handle multiple disconnect calls gracefully', () => {
      client = new MCPClient({ apiKey: 'lano_test' });
      
      client.disconnect();
      client.disconnect();
      client.disconnect();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('request', () => {
    it('should throw error when not authenticated', async () => {
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue(null),
        clear: vi.fn(),
        isTokenExpired: vi.fn()
      };

      client = new MCPClient({
        apiKey: 'lano_test',
        tokenStorage: mockStorage
      });

      await expect(client.request('test/method')).rejects.toThrow('Not authenticated');
    });

    it('should make request with API key header in apikey mode', async () => {
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          access_token: 'lano_stored_key',
          token_type: 'api-key',
          expires_in: 0
        }),
        clear: vi.fn(),
        isTokenExpired: vi.fn().mockReturnValue(false)
      };

      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ result: { data: 'test' } })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      const result = await client.request('test/method', { param: 'value' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://mcp.lanonasis.com/api',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'lano_stored_key'
          })
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should throw error on 401 with invalid API key', async () => {
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          access_token: 'lano_invalid_key',
          token_type: 'api-key',
          expires_in: 0
        }),
        clear: vi.fn(),
        isTokenExpired: vi.fn().mockReturnValue(false)
      };

      mockFetch.mockResolvedValue({
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_invalid',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await expect(client.request('test/method')).rejects.toThrow(
        'Invalid API key - please check your credentials'
      );
    });

    it('should throw error on API error response', async () => {
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          access_token: 'lano_test',
          token_type: 'api-key',
          expires_in: 0
        }),
        clear: vi.fn(),
        isTokenExpired: vi.fn().mockReturnValue(false)
      };

      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({
          error: { message: 'Method not found' }
        })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await expect(client.request('invalid/method')).rejects.toThrow('Method not found');
    });
  });

  describe('Memory Operations', () => {
    let mockStorage: any;

    beforeEach(() => {
      mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          access_token: 'lano_test_key',
          token_type: 'api-key',
          expires_in: 0
        }),
        clear: vi.fn(),
        isTokenExpired: vi.fn().mockReturnValue(false)
      };
    });

    it('should call createMemory with correct params', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ result: { id: 'mem_123' } })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await client.createMemory('Test Title', 'Test Content', { tags: ['test'] });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"method":"memory/create"')
        })
      );
    });

    it('should call searchMemories with correct params', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ result: [] })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await client.searchMemories('test query', { limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"method":"memory/search"')
        })
      );
    });

    it('should call getMemory with correct params', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ result: { id: 'mem_123' } })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await client.getMemory('mem_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"method":"memory/get"')
        })
      );
    });

    it('should call updateMemory with correct params', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ result: { id: 'mem_123' } })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await client.updateMemory('mem_123', { title: 'Updated Title' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"method":"memory/update"')
        })
      );
    });

    it('should call deleteMemory with correct params', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ result: null })
      } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        mcpEndpoint: 'https://mcp.lanonasis.com',
        tokenStorage: mockStorage
      });

      await client.deleteMemory('mem_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"method":"memory/delete"')
        })
      );
    });
  });

  describe('logout', () => {
    it('should clear tokens and disconnect', async () => {
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          access_token: 'lano_test',
          token_type: 'api-key',
          expires_in: 0
        }),
        clear: vi.fn(),
        isTokenExpired: vi.fn()
      };

      mockFetch.mockResolvedValue({ ok: true } as Response);

      client = new MCPClient({
        apiKey: 'lano_test',
        tokenStorage: mockStorage
      });

      await client.logout();

      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockStorage = {
        store: vi.fn(),
        retrieve: vi.fn().mockResolvedValue({
          access_token: 'lano_test',
          refresh_token: 'refresh_test',
          token_type: 'Bearer',
          expires_in: 3600
        }),
        clear: vi.fn(),
        isTokenExpired: vi.fn()
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      client = new MCPClient({
        clientId: 'test_client',
        tokenStorage: mockStorage
      });

      // Should not throw
      await client.logout();

      expect(mockStorage.clear).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
