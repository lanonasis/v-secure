const {
  createSessionId,
  normalizeVortexEndpoint,
  vortexHttpEndpointToWebSocketUrl
} = require('../dist/security');

describe('vortex-mcp-sdk security helpers', () => {
  test('createSessionId produces a prefixed id', () => {
    const id = createSessionId('session');
    expect(id).toMatch(/^session_\d+_[A-Za-z0-9_-]+$/);
  });

  test('normalizeVortexEndpoint rejects http:// by default', () => {
    expect(() => normalizeVortexEndpoint('http://localhost:4056')).toThrow(/https:\/\//);
  });

  test('normalizeVortexEndpoint allows http:// when explicitly enabled', () => {
    expect(normalizeVortexEndpoint('http://localhost:4056', { allowInsecureHttp: true })).toBe(
      'http://localhost:4056'
    );
  });

  test('vortexHttpEndpointToWebSocketUrl converts to wss/ws and appends /mcp/events', () => {
    expect(vortexHttpEndpointToWebSocketUrl('https://example.com')).toBe('wss://example.com/mcp/events');
    expect(vortexHttpEndpointToWebSocketUrl('http://example.com/api')).toBe('ws://example.com/api/mcp/events');
  });

  test('normalizeVortexEndpoint enforces allowedHosts when provided', () => {
    expect(() =>
      normalizeVortexEndpoint('https://example.com', { allowedHosts: ['api.vortex-secure.com'] })
    ).toThrow(/allowed host/i);
    expect(normalizeVortexEndpoint('https://example.com', { allowedHosts: ['example.com'] })).toBe(
      'https://example.com'
    );
    expect(
      normalizeVortexEndpoint('https://localhost:4056', { allowedHosts: ['localhost:4056'] })
    ).toBe('https://localhost:4056');
  });
});
