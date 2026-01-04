// Unit tests for VortexClient

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { VortexClient, createVortexClient } from '../index';

// Mock fetch for HTTP adapter
global.fetch = vi.fn();

describe('VortexClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with required options', () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      expect(client).toBeDefined();
      expect(client.catalog).toBeDefined();
      expect(client.apiKeys).toBeDefined();
      expect(client.services).toBeDefined();
      expect(client.router).toBeDefined();
      expect(client.events).toBeDefined();
    });

    it('should accept optional MCP tool identification', () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
        toolId: 'my-tool',
        toolName: 'My Tool',
      });

      expect(client).toBeDefined();
    });

    it('should set default values', () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      // Internal defaults are set
      expect(client).toBeDefined();
    });
  });

  describe('factory functions', () => {
    it('createVortexClient should create a client', () => {
      const client = createVortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      expect(client).toBeInstanceOf(VortexClient);
    });
  });

  describe('event handling', () => {
    it('should allow subscribing to events', () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      const handler = vi.fn();
      const unsubscribe = client.on('error', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow subscribing to all events', () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      const handler = vi.fn();
      const unsubscribe = client.onAll(handler);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('healthCheck', () => {
    it('should return a health check result with latencyMs', async () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      const result = await client.healthCheck();

      // The healthCheck should return a result object with expected shape
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('latencyMs');
      expect(typeof result.latencyMs).toBe('number');
    }, 10000);
  });

  describe('session management', () => {
    it('getActiveSessions should return empty array initially', () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      const sessions = client.getActiveSessions();

      expect(sessions).toEqual([]);
    });
  });

  describe('injectSecrets', () => {
    it('should throw in non-Node environments', async () => {
      // Mock non-Node environment
      const originalProcess = global.process;
      // @ts-ignore
      delete global.process;

      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      await expect(client.injectSecrets(['TEST_KEY'])).rejects.toThrow(
        'injectSecrets is only available in Node.js environments'
      );

      // Restore
      global.process = originalProcess;
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', async () => {
      const client = new VortexClient({
        endpoint: 'https://api.test.com',
        apiKey: 'lms_prod_test123',
      });

      // Should not throw
      await expect(client.cleanup()).resolves.toBeUndefined();
    });
  });
});

describe('VortexClient legacy support', () => {
  it('VortexMCPClient should work for backward compatibility', async () => {
    const { VortexMCPClient } = await import('../index');

    const client = new VortexMCPClient({
      vortexEndpoint: 'https://api.test.com',
      mcpToken: 'lms_prod_test123',
      toolId: 'my-tool',
      toolName: 'My Tool',
    });

    expect(client).toBeInstanceOf(VortexClient);
  });
});
