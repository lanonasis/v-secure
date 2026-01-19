import type { Context, Config } from "@netlify/edge-functions";

/**
 * LanOnasis Security Shield v2.0
 * Comprehensive protection against bots, scanners, and malicious traffic
 * 
 * Features:
 * - Sensitive file blocking (returns 404, not 200)
 * - Honeypot trap endpoints
 * - Malicious user agent detection
 * - Request pattern analysis
 * - Suspicious behavior logging
 * - Rate limiting preparation
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Enable/disable features
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,

  // Response behavior
  honeypotDelay: 2000, // ms - slow down bots
  blockResponse: 404,  // 404 looks like "nothing here" vs 403 which says "protected"
};

// ============================================
// BLOCKED PATTERNS
// ============================================

// Sensitive files that should NEVER be accessible
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
  /^\/\.pnpm/i,
  /^\/\.vscode/i,
  /^\/\.idea/i,
  /^\/wp-config\.php/i,
  /^\/config\.php/i,
  /^\/config\.yml/i,
  /^\/config\.yaml/i,
  /^\/database\.yml/i,
  /^\/secrets\./i,
  /^\/credentials/i,
  /^\/\.secrets/i,
  /^\/private/i,
  /^\/backup/i,
  /^\/\.backup/i,
  /^\/dump\./i,
  /^\/\.dump/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.old$/i,
  /\.orig$/i,
  /\.save$/i,
  /\.swp$/i,
  /\.log$/i,
  /^\/debug/i,
  /^\/trace/i,
  /^\/logs\//i,
];

// Honeypot URLs - if anyone hits these, they're definitely scanning
const HONEYPOT_URLS = [
  /^\/webhook$/i,
  /^\/api\/webhook$/i,
  /^\/hooks$/i,
  /^\/callback$/i,
  /^\/admin$/i,
  /^\/administrator$/i,
  /^\/wp-admin/i,
  /^\/wp-login/i,
  /^\/wp-content/i,
  /^\/wp-includes/i,
  /^\/wordpress/i,
  /^\/phpmyadmin/i,
  /^\/pma/i,
  /^\/myadmin/i,
  /^\/mysql/i,
  /^\/xmlrpc\.php/i,
  /^\/wlwmanifest\.xml/i,
  /^\/wp-json/i,
  /^\/cgi-bin/i,
  /^\/shell/i,
  /^\/cmd/i,
  /^\/exec/i,
  /^\/eval/i,
  /^\/phpinfo/i,
  /^\/info\.php/i,
  /^\/test\.php/i,
  /^\/debug\.php/i,
  /^\/install\.php/i,
  /^\/setup\.php/i,
  /^\/config\.php/i,
  /^\/db\.php/i,
  /^\/database\.php/i,
  /^\/\.well-known\/security\.txt$/i,
  /^\/actuator/i,          // Spring Boot
  /^\/api\/v1\/pods/i,     // Kubernetes
  /^\/console/i,           // Various admin consoles
  /^\/manager/i,           // Tomcat manager
  /^\/jmx-console/i,       // JBoss
  /^\/invoker/i,           // JBoss
  /^\/web-console/i,       // JBoss
  /^\/solr/i,              // Apache Solr
  /^\/\.git\/config/i,
  /^\/\.git\/HEAD/i,
  /^\/\.svn/i,
  /^\/\.hg/i,
  /^\/\.bzr/i,
  /^\/server-status/i,     // Apache status
  /^\/server-info/i,       // Apache info
  /^\/elmah\.axd/i,        // ASP.NET error log
  /^\/trace\.axd/i,        // ASP.NET trace
  /^\/api\/swagger/i,      // Swagger docs (info disclosure)
  /^\/swagger-ui/i,
  /^\/api-docs/i,
  /^\/graphql/i,           // GraphQL endpoint probing
  /^\/graphiql/i,
];

// Malicious user agents
const MALICIOUS_USER_AGENTS = [
  /python-requests/i,
  /python-urllib/i,
  /python\/\d/i,
  /curl\/\d/i,
  /wget/i,
  /libwww-perl/i,
  /lwp-trivial/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /dirb/i,
  /nuclei/i,
  /httpx/i,
  /wpscan/i,
  /joomscan/i,
  /droopescan/i,
  /skipfish/i,
  /nessus/i,
  /openvas/i,
  /acunetix/i,
  /burpsuite/i,
  /qualys/i,
  /webinspect/i,
  /arachni/i,
  /w3af/i,
  /vega/i,
  /zap/i,           // OWASP ZAP
  /havij/i,
  /pangolin/i,
  /xsser/i,
  /commix/i,
  /dalfox/i,
  /xsstrike/i,
  /scrapy/i,
  /mechanize/i,
  /go-http-client/i,
  /java\/\d/i,
  /okhttp/i,
  /axios/i,
  /node-fetch/i,
  /got \(/i,
  /undici/i,
  /headlesschrome/i,
  /phantomjs/i,
  /slimerjs/i,
  /htmlunit/i,
  /screaming frog/i,
  /petalbot/i,       // Huawei's aggressive crawler
  /megaindex/i,
  /blexbot/i,
  /seokicks/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /mj12bot/i,
  /aspiegelbot/i,
  /bytespider/i,     // TikTok's aggressive crawler
  /dataforseobot/i,
  /gptbot/i,         // OpenAI (if you want to block AI crawlers)
  /anthropic-ai/i,   // Anthropic (optional)
  /claudebot/i,      // Claude (optional)
];

// Suspicious request patterns
const SUSPICIOUS_PATTERNS = [
  /\.\.\//,                    // Path traversal
  /%2e%2e/i,                   // Encoded path traversal
  /<script/i,                  // XSS attempt
  /%3cscript/i,                // Encoded XSS
  /javascript:/i,              // XSS
  /vbscript:/i,                // XSS
  /onload=/i,                  // XSS
  /onerror=/i,                 // XSS
  /onclick=/i,                 // XSS
  /' or '/i,                   // SQL injection
  /" or "/i,                   // SQL injection
  /union select/i,             // SQL injection
  /concat\(/i,                 // SQL injection
  /group_concat/i,             // SQL injection
  /information_schema/i,       // SQL injection
  /sleep\(\d+\)/i,             // SQL injection timing
  /benchmark\(/i,              // SQL injection timing
  /waitfor delay/i,            // MSSQL injection
  /; *shutdown/i,              // SQL injection
  /\$\{.*\}/,                  // Template injection
  /\{\{.*\}\}/,                // Template injection
  /<%.*%>/,                    // Server-side template
  /exec\(/i,                   // Command injection
  /system\(/i,                 // Command injection
  /passthru\(/i,               // PHP injection
  /shell_exec/i,               // PHP injection
  /phpinfo/i,                  // PHP info disclosure
  /eval\(/i,                   // Code injection
  /base64_decode/i,            // PHP injection
  /gzinflate/i,                // PHP obfuscation
  /str_rot13/i,                // PHP obfuscation
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function matchesAny(str: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(str));
}

function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

// ============================================
// LOGGING
// ============================================

interface SecurityLog {
  id: string;
  type: "BLOCK" | "HONEYPOT" | "SUSPICIOUS" | "ATTACK";
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

function logSecurityEvent(log: SecurityLog): void {
  if (CONFIG.enableLogging) {
    console.log(JSON.stringify(log));
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

function createBlockResponse(status: number = CONFIG.blockResponse): Response {
  return new Response(status === 404 ? "Not Found" : "Forbidden", {
    status,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "text/plain",
    },
  });
}

async function createHoneypotResponse(): Promise<Response> {
  // Add delay to slow down automated scanners
  if (CONFIG.honeypotDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.honeypotDelay));
  }

  return new Response("Not Found", {
    status: 404,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      "Content-Type": "text/plain",
    },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function securityShield(
  req: Request,
  context: Context
): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const searchParams = url.search;
  const method = req.method;
  const userAgent = req.headers.get("user-agent") || "";
  const referer = req.headers.get("referer") || "";

  const requestId = generateRequestId();
  const geo = context.geo || {};

  const baseLog: Omit<SecurityLog, "type" | "reason"> = {
    id: requestId,
    path: pathname,
    method,
    userAgent: userAgent.substring(0, 200),
    ip: context.ip || "unknown",
    country: geo.country?.code || "unknown",
    city: geo.city || "unknown",
    timestamp: new Date().toISOString(),
    query: searchParams || undefined,
    referer: referer || undefined,
  };

  // ----------------------------------------
  // 1. Check for sensitive files
  // ----------------------------------------
  if (CONFIG.enablePathBlocking && matchesAny(pathname, SENSITIVE_FILES)) {
    logSecurityEvent({
      ...baseLog,
      type: "BLOCK",
      reason: "SENSITIVE_FILE_ACCESS",
    });
    return createBlockResponse(404);
  }

  // ----------------------------------------
  // 2. Check honeypot URLs
  // ----------------------------------------
  if (CONFIG.enableHoneypot && matchesAny(pathname, HONEYPOT_URLS)) {
    logSecurityEvent({
      ...baseLog,
      type: "HONEYPOT",
      reason: "HONEYPOT_TRIGGERED",
    });
    return await createHoneypotResponse();
  }

  // ----------------------------------------
  // 3. Check malicious user agents
  // ----------------------------------------
  if (CONFIG.enableUserAgentBlocking) {
    // Block empty user agents on POST/PUT/DELETE (bots often don't set UA)
    if (!userAgent && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      logSecurityEvent({
        ...baseLog,
        type: "BLOCK",
        reason: "EMPTY_USER_AGENT_ON_WRITE",
      });
      return createBlockResponse(403);
    }

    // Block known malicious user agents
    if (matchesAny(userAgent, MALICIOUS_USER_AGENTS)) {
      logSecurityEvent({
        ...baseLog,
        type: "BLOCK",
        reason: "MALICIOUS_USER_AGENT",
      });
      return createBlockResponse(403);
    }
  }

  // ----------------------------------------
  // 4. Check for attack patterns in URL
  // ----------------------------------------
  const fullUrl = pathname + searchParams;
  if (matchesAny(fullUrl, SUSPICIOUS_PATTERNS)) {
    logSecurityEvent({
      ...baseLog,
      type: "ATTACK",
      reason: "SUSPICIOUS_PATTERN_IN_URL",
    });
    return createBlockResponse(400);
  }

  // ----------------------------------------
  // 5. Check for attack patterns in referer
  // ----------------------------------------
  if (referer && matchesAny(referer, SUSPICIOUS_PATTERNS)) {
    logSecurityEvent({
      ...baseLog,
      type: "ATTACK",
      reason: "SUSPICIOUS_PATTERN_IN_REFERER",
    });
    return createBlockResponse(400);
  }

  // ----------------------------------------
  // 6. Additional checks for POST requests
  // ----------------------------------------
  if (method === "POST") {
    // Log all POST requests for monitoring (could be webhook probing)
    logSecurityEvent({
      ...baseLog,
      type: "SUSPICIOUS",
      reason: "POST_REQUEST_LOGGED",
    });
  }

  // ----------------------------------------
  // All checks passed - continue to site
  // ----------------------------------------
  return context.next();
}

export const config: Config = {
  path: "/*",
  excludedPath: [
    // Static assets that don't need security checks
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/sitemap-*.xml",
    "/_next/static/*",
    "/static/*",
    "/assets/*",
    "/images/*",
    "/img/*",
    "/css/*",
    "/js/*",
    "/fonts/*",
    "/*.png",
    "/*.jpg",
    "/*.jpeg",
    "/*.gif",
    "/*.webp",
    "/*.svg",
    "/*.ico",
    "/*.woff",
    "/*.woff2",
    "/*.ttf",
    "/*.eot",
  ],
};
