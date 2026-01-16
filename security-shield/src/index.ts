/**
 * @lanonasis/security-shield
 * Enterprise-grade security for Netlify deployments
 * 
 * @example
 * // In your edge function:
 * import { createSecurityShield, defaultConfig } from '@lanonasis/security-shield';
 * 
 * export default createSecurityShield({
 *   ...defaultConfig,
 *   enableHoneypot: true,
 *   customBlockedPaths: ['/my-secret-path'],
 * });
 */

// ============================================
// TYPES
// ============================================

export interface SecurityConfig {
  /** Enable/disable honeypot trap endpoints */
  enableHoneypot: boolean;
  /** Enable/disable user agent blocking */
  enableUserAgentBlocking: boolean;
  /** Enable/disable path blocking */
  enablePathBlocking: boolean;
  /** Enable/disable security event logging */
  enableLogging: boolean;
  /** Delay in ms for honeypot responses (slows down bots) */
  honeypotDelay: number;
  /** HTTP status code to return for blocked requests */
  blockResponse: 403 | 404;
  /** Additional paths to block (regex patterns) */
  customBlockedPaths?: RegExp[];
  /** Additional user agents to block (regex patterns) */
  customBlockedUserAgents?: RegExp[];
  /** Paths to exclude from security checks */
  excludedPaths?: string[];
}

export interface SecurityLog {
  id: string;
  type: 'BLOCK' | 'HONEYPOT' | 'SUSPICIOUS' | 'ATTACK';
  reason: string;
  path: string;
  method: string;
  userAgent: string;
  ip: string;
  country: string;
  city: string;
  timestamp: string;
  query?: string;
  referer?: string;
}

export interface GeoInfo {
  country?: { code?: string };
  city?: string;
}

export interface EdgeContext {
  ip?: string;
  geo?: GeoInfo;
  next: () => Promise<Response>;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const defaultConfig: SecurityConfig = {
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,
  honeypotDelay: 2000,
  blockResponse: 404,
};

// ============================================
// BLOCKED PATTERNS (Exported for customization)
// ============================================

export const SENSITIVE_FILES: RegExp[] = [
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

export const HONEYPOT_URLS: RegExp[] = [
  /^\/webhook$/i,
  /^\/api\/webhook$/i,
  /^\/admin$/i,
  /^\/administrator$/i,
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/phpmyadmin/i,
  /^\/xmlrpc\.php/i,
  /^\/cgi-bin/i,
  /^\/shell/i,
  /^\/actuator/i,
  /^\/console/i,
];

export const MALICIOUS_USER_AGENTS: RegExp[] = [
  /python-requests/i,
  /curl\/\d/i,
  /wget/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /nuclei/i,
  /wpscan/i,
  /scrapy/i,
  /go-http-client/i,
  /petalbot/i,
  /bytespider/i,
  /semrushbot/i,
  /ahrefsbot/i,
];

export const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\.\.\//,
  /<script/i,
  /union select/i,
  /information_schema/i,
  /sleep\(\d+\)/i,
  /exec\(/i,
  /system\(/i,
  /eval\(/i,
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a string matches any pattern in an array
 */
export function matchesAny(str: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(str));
}

/**
 * Generate a short request ID
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Create a block response
 */
export function createBlockResponse(status: 400 | 403 | 404 = 404): Response {
  const messages: Record<number, string> = {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
  };
  return new Response(messages[status] || 'Forbidden', {
    status,
    headers: {
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain',
    },
  });
}

/**
 * Create a delayed honeypot response
 */
export async function createHoneypotResponse(delayMs: number = 2000): Promise<Response> {
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return createBlockResponse(404);
}

/**
 * Log a security event
 */
export function logSecurityEvent(log: SecurityLog): void {
  console.log(JSON.stringify(log));
}

// ============================================
// MAIN FACTORY FUNCTION
// ============================================

/**
 * Create a security shield edge function handler
 * 
 * @example
 * import { createSecurityShield } from '@lanonasis/security-shield';
 * 
 * export default createSecurityShield();
 * 
 * // Or with custom config:
 * export default createSecurityShield({
 *   enableHoneypot: true,
 *   customBlockedPaths: [/^\/secret/i],
 * });
 */
export function createSecurityShield(config: Partial<SecurityConfig> = {}) {
  const finalConfig: SecurityConfig = { ...defaultConfig, ...config };
  
  const blockedPaths = [...SENSITIVE_FILES, ...(finalConfig.customBlockedPaths || [])];
  const honeypotUrls = HONEYPOT_URLS;
  const blockedUserAgents = [...MALICIOUS_USER_AGENTS, ...(finalConfig.customBlockedUserAgents || [])];
  
  return async function securityShield(req: Request, context: EdgeContext): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    
    const requestId = generateRequestId();
    const geo = context.geo || {};
    
    const baseLog: Omit<SecurityLog, 'type' | 'reason'> = {
      id: requestId,
      path: pathname,
      method,
      userAgent: userAgent.substring(0, 200),
      ip: context.ip || 'unknown',
      country: geo.country?.code || 'unknown',
      city: geo.city || 'unknown',
      timestamp: new Date().toISOString(),
      query: url.search || undefined,
      referer: referer || undefined,
    };
    
    // Check sensitive files
    if (finalConfig.enablePathBlocking && matchesAny(pathname, blockedPaths)) {
      if (finalConfig.enableLogging) {
        logSecurityEvent({ ...baseLog, type: 'BLOCK', reason: 'SENSITIVE_FILE_ACCESS' });
      }
      return createBlockResponse(finalConfig.blockResponse);
    }
    
    // Check honeypot URLs
    if (finalConfig.enableHoneypot && matchesAny(pathname, honeypotUrls)) {
      if (finalConfig.enableLogging) {
        logSecurityEvent({ ...baseLog, type: 'HONEYPOT', reason: 'HONEYPOT_TRIGGERED' });
      }
      return createHoneypotResponse(finalConfig.honeypotDelay);
    }
    
    // Check user agents
    if (finalConfig.enableUserAgentBlocking) {
      if (!userAgent && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (finalConfig.enableLogging) {
          logSecurityEvent({ ...baseLog, type: 'BLOCK', reason: 'EMPTY_USER_AGENT_ON_WRITE' });
        }
        return createBlockResponse(403);
      }
      
      if (matchesAny(userAgent, blockedUserAgents)) {
        if (finalConfig.enableLogging) {
          logSecurityEvent({ ...baseLog, type: 'BLOCK', reason: 'MALICIOUS_USER_AGENT' });
        }
        return createBlockResponse(403);
      }
    }
    
    // Check attack patterns
    const fullUrl = pathname + url.search;
    if (matchesAny(fullUrl, SUSPICIOUS_PATTERNS)) {
      if (finalConfig.enableLogging) {
        logSecurityEvent({ ...baseLog, type: 'ATTACK', reason: 'SUSPICIOUS_PATTERN' });
      }
      return createBlockResponse(400);
    }
    
    return context.next();
  };
}

// ============================================
// PRESETS
// ============================================

/** Minimal security - only blocks sensitive files */
export const minimalConfig: Partial<SecurityConfig> = {
  enableHoneypot: false,
  enableUserAgentBlocking: false,
  enablePathBlocking: true,
  enableLogging: false,
};

/** Standard security - recommended for most sites */
export const standardConfig: Partial<SecurityConfig> = {
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,
  honeypotDelay: 1000,
};

/** Maximum security - aggressive protection */
export const maxSecurityConfig: Partial<SecurityConfig> = {
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,
  honeypotDelay: 5000,
  blockResponse: 403,
};

// Default export
export default createSecurityShield;
