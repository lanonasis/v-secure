/**
 * LanOnasis Security Shield - Vercel Middleware
 * 
 * Place this file at:
 * - /middleware.ts (root)
 * - /src/middleware.ts (if using src directory)
 * 
 * @see https://vercel.com/docs/functions/edge-middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,
  honeypotDelay: 2000,
  blockResponse: 404 as const,
};

// ============================================
// BLOCKED PATTERNS
// ============================================

const SENSITIVE_FILES = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.htaccess/i,
  /^\/\.htpasswd/i,
  /^\/\.ssh/i,
  /^\/\.aws/i,
  /^\/\.docker/i,
  /^\/\.npmrc/i,
  /^\/\.yarnrc/i,
  /^\/wp-config\.php/i,
  /^\/config\.php/i,
  /^\/config\.ya?ml/i,
  /^\/secrets\./i,
  /^\/credentials/i,
  /^\/private/i,
  /^\/backup/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.log$/i,
];

const HONEYPOT_URLS = [
  /^\/webhook$/i,
  /^\/api\/webhook$/i,
  /^\/admin$/i,
  /^\/administrator$/i,
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/wp-content/i,
  /^\/wp-includes/i,
  /^\/phpmyadmin/i,
  /^\/pma/i,
  /^\/mysql/i,
  /^\/xmlrpc\.php/i,
  /^\/cgi-bin/i,
  /^\/shell/i,
  /^\/cmd/i,
  /^\/exec/i,
  /^\/actuator/i,
  /^\/console/i,
  /^\/manager/i,
  /^\/\.git\/config/i,
  /^\/\.git\/HEAD/i,
  /^\/server-status/i,
  /^\/swagger-ui/i,
  /^\/api-docs/i,
];

const MALICIOUS_USER_AGENTS = [
  /python-requests/i,
  /python-urllib/i,
  /curl\/\d/i,
  /wget/i,
  /libwww-perl/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /nuclei/i,
  /httpx/i,
  /wpscan/i,
  /scrapy/i,
  /go-http-client/i,
  /java\/\d/i,
  /petalbot/i,
  /bytespider/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /dotbot/i,
  /mj12bot/i,
];

const SUSPICIOUS_PATTERNS = [
  /\.\.\//,
  /%2e%2e/i,
  /<script/i,
  /%3cscript/i,
  /javascript:/i,
  /union select/i,
  /information_schema/i,
  /sleep\(\d+\)/i,
  /exec\(/i,
  /system\(/i,
  /eval\(/i,
  /base64_decode/i,
];

// ============================================
// UTILITIES
// ============================================

function matchesAny(str: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(str));
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

interface SecurityLog {
  id: string;
  type: 'BLOCK' | 'HONEYPOT' | 'SUSPICIOUS' | 'ATTACK';
  reason: string;
  path: string;
  method: string;
  userAgent: string;
  ip: string;
  country: string;
  timestamp: string;
}

function logSecurityEvent(log: SecurityLog): void {
  if (CONFIG.enableLogging) {
    console.log(JSON.stringify(log));
  }
}

// ============================================
// MIDDLEWARE
// ============================================

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const country = request.geo?.country || 'unknown';
  
  const requestId = generateRequestId();
  
  const baseLog: Omit<SecurityLog, 'type' | 'reason'> = {
    id: requestId,
    path: pathname,
    method,
    userAgent: userAgent.substring(0, 200),
    ip,
    country,
    timestamp: new Date().toISOString(),
  };

  // ----------------------------------------
  // 1. Check for sensitive files
  // ----------------------------------------
  if (CONFIG.enablePathBlocking && matchesAny(pathname, SENSITIVE_FILES)) {
    logSecurityEvent({ ...baseLog, type: 'BLOCK', reason: 'SENSITIVE_FILE_ACCESS' });
    return new NextResponse('Not Found', { status: 404 });
  }

  // ----------------------------------------
  // 2. Check honeypot URLs
  // ----------------------------------------
  if (CONFIG.enableHoneypot && matchesAny(pathname, HONEYPOT_URLS)) {
    logSecurityEvent({ ...baseLog, type: 'HONEYPOT', reason: 'HONEYPOT_TRIGGERED' });
    return new NextResponse('Not Found', { status: 404 });
  }

  // ----------------------------------------
  // 3. Check malicious user agents
  // ----------------------------------------
  if (CONFIG.enableUserAgentBlocking) {
    if (!userAgent && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      logSecurityEvent({ ...baseLog, type: 'BLOCK', reason: 'EMPTY_USER_AGENT_ON_WRITE' });
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    if (matchesAny(userAgent, MALICIOUS_USER_AGENTS)) {
      logSecurityEvent({ ...baseLog, type: 'BLOCK', reason: 'MALICIOUS_USER_AGENT' });
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // ----------------------------------------
  // 4. Check for attack patterns in URL
  // ----------------------------------------
  const fullUrl = pathname + search;
  if (matchesAny(fullUrl, SUSPICIOUS_PATTERNS)) {
    logSecurityEvent({ ...baseLog, type: 'ATTACK', reason: 'SUSPICIOUS_PATTERN_IN_URL' });
    return new NextResponse('Bad Request', { status: 400 });
  }

  // ----------------------------------------
  // 5. Add security headers to response
  // ----------------------------------------
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (uncomment for production)
  // response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  return response;
}

// ============================================
// MATCHER CONFIG
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
};
