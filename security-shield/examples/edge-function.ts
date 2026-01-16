/**
 * Example: Using @lanonasis/security-shield in your project
 * 
 * Copy this to: netlify/edge-functions/security.ts
 */

import { 
  createSecurityShield, 
  standardConfig,
  type SecurityConfig 
} from '@lanonasis/security-shield';

// Option 1: Use a preset
// export default createSecurityShield(standardConfig);

// Option 2: Custom configuration
const config: Partial<SecurityConfig> = {
  enableHoneypot: true,
  enableUserAgentBlocking: true,
  enablePathBlocking: true,
  enableLogging: true,
  honeypotDelay: 2000,
  
  // Add your custom blocked paths
  customBlockedPaths: [
    /^\/internal-api/i,
    /^\/debug/i,
  ],
};

export default createSecurityShield(config);

export const config = {
  path: '/*',
  excludedPath: [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/_next/static/*',
    '/static/*',
    '/assets/*',
    '/images/*',
    '/*.png',
    '/*.jpg',
    '/*.svg',
    '/*.woff2',
  ],
};
