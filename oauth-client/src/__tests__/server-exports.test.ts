/**
 * Tests for @lanonasis/oauth-client/server exports
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Server Exports', () => {
  describe('Module Exports', () => {
    it('should export cookie utilities', async () => {
      const module = await import('../server/index');
      expect(module.COOKIE_NAMES).toBeDefined();
      expect(module.parseCookieHeader).toBeDefined();
      expect(module.getSessionToken).toBeDefined();
      expect(module.parseUserCookieServer).toBeDefined();
      expect(module.hasSessionCookieServer).toBeDefined();
      expect(module.hasAuthCookiesServer).toBeDefined();
      expect(module.getSSOUserFromRequest).toBeDefined();
      expect(module.getSessionTokenFromRequest).toBeDefined();
      expect(module.hasSSOfromRequest).toBeDefined();
    });

    it('should export middleware functions', async () => {
      const module = await import('../server/index');
      expect(module.validateSessionMiddleware).toBeDefined();
      expect(module.requireAuth).toBeDefined();
      expect(module.optionalAuth).toBeDefined();
      expect(module.requireRole).toBeDefined();
      expect(typeof module.validateSessionMiddleware).toBe('function');
      expect(typeof module.requireAuth).toBe('function');
      expect(typeof module.optionalAuth).toBe('function');
      expect(typeof module.requireRole).toBe('function');
    });

    it('should export default constants', async () => {
      const module = await import('../server/index');
      expect(module.DEFAULT_AUTH_GATEWAY).toBe('https://auth.lanonasis.com');
      expect(module.DEFAULT_COOKIE_DOMAIN).toBe('.lanonasis.com');
      expect(module.DEFAULT_PROJECT_SCOPE).toBe('lanonasis-maas');
    });

    it('should export COOKIE_NAMES constant', async () => {
      const module = await import('../server/index');
      expect(module.COOKIE_NAMES).toBeDefined();
      expect(module.COOKIE_NAMES.SESSION).toBe('lanonasis_session');
      expect(module.COOKIE_NAMES.USER).toBe('lanonasis_user');
    });
  });
});

describe('Cookie Utilities (Server)', () => {
  describe('parseCookieHeader', () => {
    it('should parse simple cookie header', async () => {
      const { parseCookieHeader } = await import('../server/cookie-utils');
      const cookies = parseCookieHeader('foo=bar; baz=qux');
      expect(cookies).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should handle empty string', async () => {
      const { parseCookieHeader } = await import('../server/cookie-utils');
      const cookies = parseCookieHeader('');
      expect(cookies).toEqual({});
    });

    it('should handle undefined', async () => {
      const { parseCookieHeader } = await import('../server/cookie-utils');
      const cookies = parseCookieHeader(undefined as unknown as string);
      expect(cookies).toEqual({});
    });

    it('should NOT decode URL-encoded values (decoded separately when needed)', async () => {
      const { parseCookieHeader } = await import('../server/cookie-utils');
      // parseCookieHeader returns raw values; decoding happens in parseUserCookieServer
      const cookies = parseCookieHeader('name=hello%20world');
      expect(cookies.name).toBe('hello%20world');
    });

    it('should parse lanonasis cookies', async () => {
      const { parseCookieHeader, COOKIE_NAMES } = await import('../server/cookie-utils');
      const userJson = encodeURIComponent(JSON.stringify({ id: '123', email: 'test@example.com', role: 'user' }));
      const cookieHeader = `${COOKIE_NAMES.SESSION}=jwt_token_here; ${COOKIE_NAMES.USER}=${userJson}`;

      const cookies = parseCookieHeader(cookieHeader);
      expect(cookies[COOKIE_NAMES.SESSION]).toBe('jwt_token_here');
      expect(cookies[COOKIE_NAMES.USER]).toBeDefined();
    });
  });

  describe('getSessionToken', () => {
    it('should extract session token from cookies object', async () => {
      const { getSessionToken, COOKIE_NAMES } = await import('../server/cookie-utils');
      const cookies = { [COOKIE_NAMES.SESSION]: 'my-jwt-token' };
      expect(getSessionToken(cookies)).toBe('my-jwt-token');
    });

    it('should return null when session cookie missing', async () => {
      const { getSessionToken } = await import('../server/cookie-utils');
      expect(getSessionToken({})).toBeNull();
    });

    it('should extract from cookie header string', async () => {
      const { getSessionToken, COOKIE_NAMES } = await import('../server/cookie-utils');
      const header = `${COOKIE_NAMES.SESSION}=token123; other=value`;
      expect(getSessionToken(header)).toBe('token123');
    });
  });

  describe('parseUserCookieServer', () => {
    it('should parse valid user cookie', async () => {
      const { parseUserCookieServer, COOKIE_NAMES } = await import('../server/cookie-utils');
      const user = { id: 'user-123', email: 'test@example.com', role: 'admin' };
      const cookies = { [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)) };

      const result = parseUserCookieServer(cookies);
      expect(result).toEqual(user);
    });

    it('should return null for missing cookie', async () => {
      const { parseUserCookieServer } = await import('../server/cookie-utils');
      expect(parseUserCookieServer({})).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const { parseUserCookieServer, COOKIE_NAMES } = await import('../server/cookie-utils');
      const cookies = { [COOKIE_NAMES.USER]: 'not-valid-json' };
      expect(parseUserCookieServer(cookies)).toBeNull();
    });

    it('should return null for missing required fields', async () => {
      const { parseUserCookieServer, COOKIE_NAMES } = await import('../server/cookie-utils');
      const partialUser = { id: 'user-123' }; // Missing email and role
      const cookies = { [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(partialUser)) };
      expect(parseUserCookieServer(cookies)).toBeNull();
    });
  });

  describe('hasSessionCookieServer', () => {
    it('should return true when session cookie exists', async () => {
      const { hasSessionCookieServer, COOKIE_NAMES } = await import('../server/cookie-utils');
      expect(hasSessionCookieServer({ [COOKIE_NAMES.SESSION]: 'token' })).toBe(true);
    });

    it('should return false when session cookie missing', async () => {
      const { hasSessionCookieServer } = await import('../server/cookie-utils');
      expect(hasSessionCookieServer({})).toBe(false);
    });
  });

  describe('hasAuthCookiesServer', () => {
    it('should return true when both cookies exist and valid', async () => {
      const { hasAuthCookiesServer, COOKIE_NAMES } = await import('../server/cookie-utils');
      const user = { id: '123', email: 'test@example.com', role: 'user' };
      const cookies = {
        [COOKIE_NAMES.SESSION]: 'token',
        [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)),
      };
      expect(hasAuthCookiesServer(cookies)).toBe(true);
    });

    it('should return false when session missing', async () => {
      const { hasAuthCookiesServer, COOKIE_NAMES } = await import('../server/cookie-utils');
      const user = { id: '123', email: 'test@example.com', role: 'user' };
      const cookies = {
        [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)),
      };
      expect(hasAuthCookiesServer(cookies)).toBe(false);
    });
  });
});

describe('Request Helpers', () => {
  describe('getSSOUserFromRequest', () => {
    it('should extract user from req.cookies', async () => {
      const { getSSOUserFromRequest, COOKIE_NAMES } = await import('../server/cookie-utils');
      const user = { id: '123', email: 'test@example.com', role: 'admin' };
      const req = {
        cookies: { [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)) },
      };
      expect(getSSOUserFromRequest(req)).toEqual(user);
    });

    it('should extract user from cookie header', async () => {
      const { getSSOUserFromRequest, COOKIE_NAMES } = await import('../server/cookie-utils');
      const user = { id: '456', email: 'user@example.com', role: 'user' };
      const userJson = encodeURIComponent(JSON.stringify(user));
      const req = {
        headers: { cookie: `${COOKIE_NAMES.USER}=${userJson}` },
      };
      expect(getSSOUserFromRequest(req)).toEqual(user);
    });

    it('should return null when no cookies', async () => {
      const { getSSOUserFromRequest } = await import('../server/cookie-utils');
      expect(getSSOUserFromRequest({})).toBeNull();
      expect(getSSOUserFromRequest({ headers: {} })).toBeNull();
    });
  });

  describe('getSessionTokenFromRequest', () => {
    it('should extract token from req.cookies', async () => {
      const { getSessionTokenFromRequest, COOKIE_NAMES } = await import('../server/cookie-utils');
      const req = {
        cookies: { [COOKIE_NAMES.SESSION]: 'jwt-token-123' },
      };
      expect(getSessionTokenFromRequest(req)).toBe('jwt-token-123');
    });

    it('should extract token from cookie header', async () => {
      const { getSessionTokenFromRequest, COOKIE_NAMES } = await import('../server/cookie-utils');
      const req = {
        headers: { cookie: `${COOKIE_NAMES.SESSION}=header-token` },
      };
      expect(getSessionTokenFromRequest(req)).toBe('header-token');
    });
  });

  describe('hasSSOfromRequest', () => {
    it('should return true when authenticated', async () => {
      const { hasSSOfromRequest, COOKIE_NAMES } = await import('../server/cookie-utils');
      const user = { id: '123', email: 'test@example.com', role: 'user' };
      const req = {
        cookies: {
          [COOKIE_NAMES.SESSION]: 'token',
          [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)),
        },
      };
      expect(hasSSOfromRequest(req)).toBe(true);
    });

    it('should return false when not authenticated', async () => {
      const { hasSSOfromRequest } = await import('../server/cookie-utils');
      expect(hasSSOfromRequest({})).toBe(false);
    });
  });
});

describe('Middleware', () => {
  describe('requireAuth', () => {
    it('should return a middleware function', async () => {
      const { requireAuth } = await import('../server/middleware');
      const middleware = requireAuth();
      expect(typeof middleware).toBe('function');
    });

    it('should call next when user is authenticated', async () => {
      const { requireAuth, COOKIE_NAMES } = await import('../server/index');
      const middleware = requireAuth();

      const user = { id: '123', email: 'test@example.com', role: 'user' };
      const req = {
        cookies: {
          [COOKIE_NAMES.SESSION]: 'token',
          [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)),
        },
      } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { requireAuth } = await import('../server/middleware');
      const middleware = requireAuth();

      const req = { cookies: {} } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        clearCookie: vi.fn(), // Middleware clears invalid cookies
      } as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should return a middleware function', async () => {
      const { optionalAuth } = await import('../server/middleware');
      const middleware = optionalAuth();
      expect(typeof middleware).toBe('function');
    });

    it('should always call next', async () => {
      const { optionalAuth } = await import('../server/middleware');
      const middleware = optionalAuth();

      const req = {} as any;
      const res = {} as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should attach user when authenticated', async () => {
      const { optionalAuth, COOKIE_NAMES } = await import('../server/index');
      const middleware = optionalAuth();

      const user = { id: '123', email: 'test@example.com', role: 'user' };
      const req = {
        cookies: {
          [COOKIE_NAMES.SESSION]: 'token',
          [COOKIE_NAMES.USER]: encodeURIComponent(JSON.stringify(user)),
        },
      } as any;
      const res = {} as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return a middleware function', async () => {
      const { requireRole } = await import('../server/middleware');
      const middleware = requireRole('admin');
      expect(typeof middleware).toBe('function');
    });

    it('should allow access when user has required role', async () => {
      const { requireRole } = await import('../server/index');
      const middleware = requireRole('admin');

      // requireRole expects req.user to be pre-populated (use after requireAuth)
      const user = { id: '123', email: 'test@example.com', role: 'admin' };
      const req = { user } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when user has wrong role', async () => {
      const { requireRole } = await import('../server/index');
      const middleware = requireRole('admin');

      // requireRole expects req.user to be pre-populated (use after requireAuth)
      const user = { id: '123', email: 'test@example.com', role: 'user' };
      const req = { user } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', async () => {
      const { requireRole } = await import('../server/index');
      const middleware = requireRole('admin');

      // No user attached - should return 401
      const req = {} as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept array of roles', async () => {
      const { requireRole } = await import('../server/index');
      const middleware = requireRole(['admin', 'moderator']);

      // requireRole expects req.user to be pre-populated (use after requireAuth)
      const user = { id: '123', email: 'test@example.com', role: 'moderator' };
      const req = { user } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any;
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateSessionMiddleware', () => {
    it('should return a middleware function', async () => {
      const { validateSessionMiddleware } = await import('../server/middleware');
      const middleware = validateSessionMiddleware();
      expect(typeof middleware).toBe('function');
    });
  });
});
