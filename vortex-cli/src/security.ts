import { createHash, randomInt, X509Certificate } from 'crypto';
import fs from 'fs';
import { checkServerIdentity as defaultCheckServerIdentity } from 'tls';

const DEFAULT_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

export type NormalizeApiUrlOptions = {
  allowInsecureHttp?: boolean;
  allowedHosts?: string[];
};

export type TlsConfig = {
  caFile?: string;
  ca?: string;
  pinnedSpkiSha256?: string[];
};

function parseCommaSeparatedList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAllowedHostEntry(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) return '';

  // Allow IPv6 literals without brackets in hostname form.
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).toLowerCase();
  }

  return trimmed.toLowerCase();
}

function isHostAllowed(url: URL, allowedHosts: string[]): boolean {
  const urlHost = url.host.toLowerCase(); // includes port; IPv6 includes brackets
  const urlHostname = url.hostname.toLowerCase(); // IPv6 without brackets

  return allowedHosts.some((rawEntry) => {
    const entry = rawEntry.trim();
    if (!entry) return false;

    const lower = entry.toLowerCase();

    // host:port entry (single colon hostname:port or bracketed IPv6 [::1]:port)
    const isHostWithPort = /^[^:]+:\d+$/.test(lower) || /^\[[^\]]+\]:\d+$/.test(lower);
    if (isHostWithPort) {
      return urlHost === lower;
    }

    // hostname entry (including IPv6 without brackets, or [::1] without port)
    return urlHostname === normalizeAllowedHostEntry(entry);
  });
}

function toBase64UrlNoPad(base64OrBase64Url: string): string {
  const trimmed = base64OrBase64Url.trim().replace(/=+$/g, '');
  if (!trimmed) return '';
  if (trimmed.includes('+') || trimmed.includes('/')) {
    return trimmed.replace(/\+/g, '-').replace(/\//g, '_');
  }
  return trimmed;
}

function normalizeSpkiPin(pin: string): string {
  const trimmed = pin.trim();
  if (!trimmed) return '';
  const withoutPrefix = trimmed.startsWith('sha256/') ? trimmed.slice('sha256/'.length) : trimmed;
  return toBase64UrlNoPad(withoutPrefix);
}

function spkiSha256Base64UrlNoPad(certRaw: Buffer): string {
  const x509 = new X509Certificate(certRaw);
  const spkiDer = x509.publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  const digestBase64 = createHash('sha256').update(spkiDer).digest('base64');
  return toBase64UrlNoPad(digestBase64);
}

export function resolveTlsOptions(config: TlsConfig): {
  ca?: string | Buffer;
  checkServerIdentity?: (hostname: string, cert: any) => Error | undefined;
} {
  const pins = (config.pinnedSpkiSha256 ?? []).map(normalizeSpkiPin).filter(Boolean);

  const ca =
    config.ca ??
    (config.caFile ? fs.readFileSync(config.caFile, { encoding: 'utf8' }) : undefined);

  const tlsOptions: {
    ca?: string | Buffer;
    checkServerIdentity?: (hostname: string, cert: any) => Error | undefined;
  } = {};

  if (ca) tlsOptions.ca = ca;

  if (pins.length > 0) {
    const pinSet = new Set(pins);
    tlsOptions.checkServerIdentity = (hostname: string, cert: any): Error | undefined => {
      const defaultError = defaultCheckServerIdentity(hostname, cert);
      if (defaultError) return defaultError;

      if (!cert?.raw || !Buffer.isBuffer(cert.raw)) {
        return new Error('TLS pinning failed: server certificate is not available');
      }

      const actual = spkiSha256Base64UrlNoPad(cert.raw);
      if (!pinSet.has(actual)) {
        return new Error(
          `TLS pinning failed for ${hostname}: SPKI sha256 pin mismatch (got sha256/${actual})`
        );
      }
      return undefined;
    };
  }

  return tlsOptions;
}

export function parseAllowedHosts(value: string | undefined): string[] {
  return parseCommaSeparatedList(value);
}

export function parseSpkiPins(value: string | undefined): string[] {
  return parseCommaSeparatedList(value);
}

export function normalizeApiUrl(input: string, options: NormalizeApiUrlOptions = {}): string {
  const allowInsecureHttp = options.allowInsecureHttp ?? false;
  const allowedHosts = options.allowedHosts ?? [];

  let url: URL;
  try {
    url = new URL(input);
  } catch (error) {
    throw new Error(`Invalid API URL: ${input}`);
  }

  if (url.username || url.password) {
    throw new Error('API URL must not include credentials');
  }

  if (url.hash) {
    throw new Error('API URL must not include a URL fragment (#...)');
  }
  if (url.search) {
    throw new Error('API URL must not include a query string (?...)');
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'https:' && !(allowInsecureHttp && protocol === 'http:')) {
    throw new Error(
      'Only https:// API URLs are allowed (use --allow-insecure-http or set VORTEX_ALLOW_INSECURE_HTTP=1 for http://)'
    );
  }

  if (allowedHosts.length > 0 && !isHostAllowed(url, allowedHosts)) {
    throw new Error(
      `API URL host "${url.host}" is not in the allowed host list (set VORTEX_ALLOWED_HOSTS or use --allowed-host)`
    );
  }

  const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.origin}${basePath}`;
}

export function randomString(length: number, charset: string = DEFAULT_CHARSET): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error(`randomString length must be a positive integer (got: ${length})`);
  }
  if (typeof charset !== 'string' || charset.length < 2) {
    throw new Error('randomString charset must be a string with at least 2 characters');
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(randomInt(0, charset.length));
  }
  return result;
}

export function generateSecureValue(type: string): string {
  const safeType = (type || '').toLowerCase();

  switch (safeType) {
    case 'api_key':
      return `vx_${Date.now().toString(36)}_${randomString(40)}`;
    case 'oauth_token':
      return randomString(64);
    case 'webhook_secret':
      return randomString(32);
    default:
      return randomString(32);
  }
}
