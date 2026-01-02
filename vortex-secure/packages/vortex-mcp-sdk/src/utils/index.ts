// Utility exports

export * from './http-adapter';
export * from './event-emitter';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `req_${timestamp}_${random}`;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `session_${timestamp}_${random}`;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      await sleep(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as object).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = (obj as Record<string, unknown>)[key];
      (acc as Record<string, unknown>)[camelKey] = typeof value === 'object' && value !== null
        ? snakeToCamel(value)
        : value;
      return acc;
    }, {} as T);
  }

  return obj;
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake) as unknown as T;
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as object).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const value = (obj as Record<string, unknown>)[key];
      (acc as Record<string, unknown>)[snakeKey] = typeof value === 'object' && value !== null
        ? camelToSnake(value)
        : value;
      return acc;
    }, {} as T);
  }

  return obj;
}

/**
 * Mask sensitive values for logging
 */
export function maskSensitive(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, visibleChars) + '...' + value.substring(value.length - visibleChars);
}

/**
 * Parse a Vortex API key to extract metadata
 */
export function parseApiKey(key: string): { prefix: string; valid: boolean } {
  const vxMatch = key.match(/^vx_([a-z]+)_/);
  if (vxMatch) {
    return { prefix: `vx_${vxMatch[1]}_`, valid: true };
  }
  return { prefix: '', valid: false };
}
