// Cross-platform HTTP adapters for web, CLI, and Node.js environments

import type { HTTPAdapter, HTTPResponse, RequestOptions } from '../types';

/**
 * Detect the current platform
 */
export function detectPlatform(): 'node' | 'browser' | 'worker' {
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    return 'browser';
  }
  if (typeof self !== 'undefined' && typeof (self as any).importScripts === 'function') {
    return 'worker';
  }
  return 'node';
}

/**
 * Fetch-based HTTP adapter (works in browser, Node 18+, and workers)
 */
export class FetchHTTPAdapter implements HTTPAdapter {
  constructor(
    private baseUrl: string,
    private defaultHeaders: Record<string, string> = {}
  ) {}

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<HTTPResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    };

    const controller = new AbortController();
    const timeout = options.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        throw new HTTPError(response.status, response.statusText, data);
      }

      return {
        data,
        status: response.status,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof HTTPError) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new HTTPError(408, 'Request timeout', null);
      }
      throw error;
    }
  }

  async get<T>(url: string, options?: RequestOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('POST', url, body, options);
  }

  async put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('PUT', url, body, options);
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }
}

/**
 * Axios-based HTTP adapter for Node.js environments (better retry/interceptor support)
 */
export class AxiosHTTPAdapter implements HTTPAdapter {
  private axiosInstance: any;

  constructor(
    private baseUrl: string,
    private defaultHeaders: Record<string, string> = {},
    private autoRetry: boolean = true
  ) {
    // Dynamic import to support ESM and CJS
    this.initAxios();
  }

  private async initAxios(): Promise<void> {
    const axios = await import('axios').then(m => m.default);
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: this.defaultHeaders,
      timeout: 30000,
    });

    // Set up retry interceptor
    if (this.autoRetry) {
      this.axiosInstance.interceptors.response.use(
        (response: any) => response,
        async (error: any) => {
          if (error.response?.status >= 500 && !error.config._retry) {
            error.config._retry = true;
            return this.axiosInstance.request(error.config);
          }
          return Promise.reject(error);
        }
      );
    }
  }

  private async ensureAxios(): Promise<void> {
    if (!this.axiosInstance) {
      await this.initAxios();
    }
  }

  async get<T>(url: string, options?: RequestOptions): Promise<HTTPResponse<T>> {
    await this.ensureAxios();
    const response = await this.axiosInstance.get(url, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    };
  }

  async post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<HTTPResponse<T>> {
    await this.ensureAxios();
    const response = await this.axiosInstance.post(url, body, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    };
  }

  async put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<HTTPResponse<T>> {
    await this.ensureAxios();
    const response = await this.axiosInstance.put(url, body, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    };
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<HTTPResponse<T>> {
    await this.ensureAxios();
    const response = await this.axiosInstance.delete(url, {
      headers: options?.headers,
      timeout: options?.timeout,
      signal: options?.signal,
    });
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
    };
  }
}

/**
 * HTTP Error class
 */
export class HTTPError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HTTPError';
  }
}

/**
 * Create the appropriate HTTP adapter based on platform and configuration
 */
export function createHTTPAdapter(
  baseUrl: string,
  headers: Record<string, string>,
  options: { useAxios?: boolean; autoRetry?: boolean } = {}
): HTTPAdapter {
  const platform = detectPlatform();

  // Use Fetch for browsers and workers, optionally Axios for Node
  if (platform === 'browser' || platform === 'worker') {
    return new FetchHTTPAdapter(baseUrl, headers);
  }

  // For Node.js, prefer Axios for better retry support, fallback to Fetch
  if (options.useAxios !== false) {
    try {
      return new AxiosHTTPAdapter(baseUrl, headers, options.autoRetry);
    } catch {
      // Axios not available, use Fetch
    }
  }

  return new FetchHTTPAdapter(baseUrl, headers);
}
