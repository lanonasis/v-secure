/**
 * Tests for @lanonasis/oauth-client/react exports
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test that all exports are available
describe('React Exports', () => {
  describe('Module Exports', () => {
    it('should export useSSO hook', async () => {
      const module = await import('../react/index');
      expect(module.useSSO).toBeDefined();
      expect(typeof module.useSSO).toBe('function');
    });

    it('should export useSSOSync hook', async () => {
      const module = await import('../react/index');
      expect(module.useSSOSync).toBeDefined();
      expect(typeof module.useSSOSync).toBe('function');
    });

    it('should export cookie utilities', async () => {
      const module = await import('../react/index');
      expect(module.parseUserCookie).toBeDefined();
      expect(module.hasSessionCookie).toBeDefined();
      expect(module.hasAuthCookies).toBeDefined();
      expect(module.clearUserCookie).toBeDefined();
      expect(module.isBrowser).toBeDefined();
    });

    it('should export COOKIE_NAMES constant', async () => {
      const module = await import('../react/index');
      expect(module.COOKIE_NAMES).toBeDefined();
      expect(module.COOKIE_NAMES.SESSION).toBe('lanonasis_session');
      expect(module.COOKIE_NAMES.USER).toBe('lanonasis_user');
    });

    it('should export default constants', async () => {
      const module = await import('../react/index');
      expect(module.DEFAULT_AUTH_GATEWAY).toBe('https://auth.lanonasis.com');
      expect(module.DEFAULT_COOKIE_DOMAIN).toBe('.lanonasis.com');
      expect(module.DEFAULT_POLL_INTERVAL).toBe(30000);
      expect(module.DEFAULT_PROJECT_SCOPE).toBe('lanonasis-maas');
    });
  });

  describe('Type Exports', () => {
    it('should have proper TypeScript types', async () => {
      // This test verifies types compile correctly
      const module = await import('../react/index');

      // Type assertions (these would fail at compile time if types are wrong)
      const cookieNames: typeof module.COOKIE_NAMES = {
        SESSION: 'lanonasis_session',
        USER: 'lanonasis_user',
      };

      expect(cookieNames).toBeDefined();
    });
  });
});

describe('Cookie Utilities (Browser)', () => {
  describe('isBrowser', () => {
    it('should return false in Node.js environment', async () => {
      const { isBrowser } = await import('../react/cookie-utils-browser');
      // In Node.js test environment, window is not defined
      expect(isBrowser()).toBe(false);
    });
  });

  describe('parseUserCookie', () => {
    it('should return null in non-browser environment', async () => {
      const { parseUserCookie } = await import('../react/cookie-utils-browser');
      expect(parseUserCookie()).toBeNull();
    });
  });

  describe('hasSessionCookie', () => {
    it('should return false in non-browser environment', async () => {
      const { hasSessionCookie } = await import('../react/cookie-utils-browser');
      expect(hasSessionCookie()).toBe(false);
    });
  });

  describe('hasAuthCookies', () => {
    it('should return false in non-browser environment', async () => {
      const { hasAuthCookies } = await import('../react/cookie-utils-browser');
      expect(hasAuthCookies()).toBe(false);
    });
  });

  describe('clearUserCookie', () => {
    it('should not throw in non-browser environment', async () => {
      const { clearUserCookie } = await import('../react/cookie-utils-browser');
      expect(() => clearUserCookie()).not.toThrow();
    });
  });
});

describe('Cookie Constants', () => {
  it('should have correct cookie names', async () => {
    const { COOKIE_NAMES } = await import('../cookies/constants');
    expect(COOKIE_NAMES.SESSION).toBe('lanonasis_session');
    expect(COOKIE_NAMES.USER).toBe('lanonasis_user');
  });

  it('should have correct default values', async () => {
    const constants = await import('../cookies/constants');
    expect(constants.DEFAULT_AUTH_GATEWAY).toBe('https://auth.lanonasis.com');
    expect(constants.DEFAULT_COOKIE_DOMAIN).toBe('.lanonasis.com');
    expect(constants.DEFAULT_POLL_INTERVAL).toBe(30000);
    expect(constants.DEFAULT_PROJECT_SCOPE).toBe('lanonasis-maas');
  });
});
