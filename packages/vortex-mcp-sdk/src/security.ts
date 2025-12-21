import { createHash, randomBytes, X509Certificate } from 'crypto';
import fs from 'fs';
import { checkServerIdentity as defaultCheckServerIdentity } from 'tls';

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function createSessionId(prefix: string = 'session'): string {
  return `${prefix}_${Date.now()}_${base64UrlEncode(randomBytes(16))}`;
}

export type NormalizeVortexEndpointOptions = {
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

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).toLowerCase();
  }

  return trimmed.toLowerCase();
}

function isHostAllowed(url: URL, allowedHosts: string[]): boolean {
  const urlHost = url.host.toLowerCase();
  const urlHostname = url.hostname.toLowerCase();

  return allowedHosts.some((rawEntry) => {
    const entry = rawEntry.trim();
    if (!entry) return false;

    const lower = entry.toLowerCase();
    const isHostWithPort = /^[^:]+:\d+$/.test(lower) || /^\[[^\]]+\]:\d+$/.test(lower);
    if (isHostWithPort) {
      return urlHost === lower;
    }

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

export function normalizeVortexEndpoint(
  input: string,
  options: NormalizeVortexEndpointOptions = {}
): string {
  const allowInsecureHttp = options.allowInsecureHttp ?? false;
  const allowedHosts = options.allowedHosts ?? [];

  let url: URL;
  try {
    url = new URL(input);
  } catch (error) {
    throw new Error(`Invalid Vortex endpoint URL: ${input}`);
  }

  if (url.username || url.password) {
    throw new Error('Vortex endpoint URL must not include credentials');
  }
  if (url.hash) {
    throw new Error('Vortex endpoint URL must not include a URL fragment (#...)');
  }
  if (url.search) {
    throw new Error('Vortex endpoint URL must not include a query string (?...)');
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'https:' && !(allowInsecureHttp && protocol === 'http:')) {
    throw new Error(
      'Only https:// endpoints are allowed (set allowInsecureHttp=true for http://)'
    );
  }

  if (allowedHosts.length > 0 && !isHostAllowed(url, allowedHosts)) {
    throw new Error(`Vortex endpoint host "${url.host}" is not in the allowed host list`);
  }

  const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.origin}${basePath}`;
}

function joinUrlPath(basePath: string, pathToAdd: string): string {
  const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  const normalizedAdd = pathToAdd.startsWith('/') ? pathToAdd : `/${pathToAdd}`;
  return `${normalizedBase}${normalizedAdd}`;
}

export function vortexHttpEndpointToWebSocketUrl(httpEndpoint: string): string {
  const url = new URL(httpEndpoint);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = joinUrlPath(url.pathname, '/mcp/events');
  url.search = '';
  url.hash = '';
  return url.toString();
}
