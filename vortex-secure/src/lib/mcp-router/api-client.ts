// Thin HTTP client for auth-gateway's /api/v1/mcp/api-keys — the real
// server-side implementation of the @vortex-secure/mcp-sdk contract
// (packages/vortex-mcp-sdk/src/client/api-keys.ts), built 2026-08-23.
//
// mcp-router/api-keys.ts used to write straight to Supabase from the
// browser. Response bodies here are the bare payload (no {success, data}
// envelope) — matches the SDK's HTTPAdapter, which reads the parsed JSON
// body directly.

import { supabase } from '../supabase';

const API_BASE_URL =
  import.meta.env.VITE_CORE_API_BASE_URL ||
  import.meta.env.VITE_API_URL?.replace('/v1', '') ||
  'https://api.lanonasis.com';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    // auth-gateway's requireAuth accepts a raw Supabase JWT directly
    // (dot-containing bearer tokens are verified against Supabase) — no
    // token exchange needed, unlike Dashboard's transitional gateway-token
    // bridge.
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/mcp/api-keys${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }
  return body as T;
}

export const mcpRouterKeysApi = {
  list: <T>() => request<T>(''),
  get: <T>(id: string) => request<T>(`/${id}`),
  create: <T>(payload: unknown) => request<T>('', { method: 'POST', body: JSON.stringify(payload) }),
  update: <T>(id: string, payload: unknown) => request<T>(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  revoke: <T>(id: string, reason?: string) => request<T>(`/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reactivate: <T>(id: string) => request<T>(`/${id}/reactivate`, { method: 'POST' }),
  remove: <T>(id: string) => request<T>(`/${id}`, { method: 'DELETE' }),
  rotate: <T>(id: string) => request<T>(`/${id}/rotate`, { method: 'POST' }),
  validate: <T>(key: string) => request<T>('/validate', { method: 'POST', body: JSON.stringify({ key }) }),
  addScope: <T>(id: string, serviceKey: string, rateLimits?: { max_calls_per_minute?: number; max_calls_per_day?: number }) =>
    request<T>(`/${id}/scopes`, { method: 'POST', body: JSON.stringify({ service_key: serviceKey, ...rateLimits }) }),
  removeScope: <T>(id: string, scopeId: string) => request<T>(`/${id}/scopes/${scopeId}`, { method: 'DELETE' }),
};
