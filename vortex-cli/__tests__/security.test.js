const { generateSecureValue, normalizeApiUrl, randomString } = require('../dist/security');

describe('vortex-cli security helpers', () => {
  test('randomString produces the requested length', () => {
    expect(randomString(32)).toHaveLength(32);
  });

  test('randomString uses only the provided charset', () => {
    const charset = 'abc';
    const value = randomString(128, charset);
    expect(value).toMatch(/^[abc]+$/);
  });

  test('generateSecureValue(api_key) matches expected format', () => {
    const value = generateSecureValue('api_key');
    expect(value).toMatch(/^vx_[0-9a-z]+_[A-Za-z0-9._~-]{40}$/);
  });

  test('normalizeApiUrl rejects http:// by default', () => {
    expect(() => normalizeApiUrl('http://localhost:4056')).toThrow(/https:\/\//);
  });

  test('normalizeApiUrl allows http:// when explicitly enabled', () => {
    expect(normalizeApiUrl('http://localhost:4056', { allowInsecureHttp: true })).toBe(
      'http://localhost:4056'
    );
  });

  test('normalizeApiUrl rejects credentials, query, and fragments', () => {
    expect(() => normalizeApiUrl('https://user:pass@example.com')).toThrow(/credentials/i);
    expect(() => normalizeApiUrl('https://example.com?x=1')).toThrow(/query/i);
    expect(() => normalizeApiUrl('https://example.com#frag')).toThrow(/fragment/i);
  });

  test('normalizeApiUrl enforces allowedHosts when provided', () => {
    expect(() =>
      normalizeApiUrl('https://example.com', { allowedHosts: ['api.vortex-secure.com'] })
    ).toThrow(/allowed host/i);
    expect(normalizeApiUrl('https://example.com', { allowedHosts: ['example.com'] })).toBe('https://example.com');
    expect(
      normalizeApiUrl('https://localhost:4056', { allowedHosts: ['localhost:4056'] })
    ).toBe('https://localhost:4056');
  });
});
