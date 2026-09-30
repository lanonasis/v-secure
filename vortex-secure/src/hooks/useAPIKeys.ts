// Hook for managing API keys — routed through auth-gateway, not Supabase
//
// Rewritten 2026-08-23: this used to insert directly into Supabase from the
// browser (raw key generated client-side, only the hash stored — better
// than mcp-router/api-keys.ts's fake "encryption", but still a browser
// insert against a schema that didn't exist on the live database). Now
// calls the real server-side endpoint (auth-gateway's /api/v1/mcp/api-keys,
// matching the @vortex-secure/mcp-sdk contract) via mcpRouterKeysApi.

import { useState, useEffect, useCallback } from 'react';
import { mcpRouterKeysApi } from '../lib/mcp-router/api-client';
import type { APIKey, CreateAPIKeyRequest } from '../types/mcp-router';

interface APIKeyStats {
  total: number;
  active: number;
  revoked: number;
  expiringSoon: number;
}

interface UseAPIKeysReturn {
  apiKeys: APIKey[];
  stats: APIKeyStats;
  loading: boolean;
  error: string | null;
  createAPIKey: (request: CreateAPIKeyRequest) => Promise<{ key: APIKey; fullKey: string }>;
  revokeAPIKey: (id: string, reason?: string) => Promise<void>;
  reactivateAPIKey: (id: string) => Promise<void>;
  deleteAPIKey: (id: string) => Promise<void>;
  updateAPIKey: (id: string, updates: Partial<APIKey>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAPIKeys(): UseAPIKeysReturn {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAPIKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mcpRouterKeysApi.list<{ api_keys: APIKey[] }>();
      setAPIKeys(response.api_keys || []);
    } catch (err: any) {
      setError(err.message);
      setAPIKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAPIKeys();
  }, [fetchAPIKeys]);

  const stats: APIKeyStats = {
    total: apiKeys.length,
    active: apiKeys.filter(k => k.is_active).length,
    revoked: apiKeys.filter(k => !k.is_active).length,
    expiringSoon: apiKeys.filter(k => {
      if (!k.expires_at) return false;
      const expiresIn = new Date(k.expires_at).getTime() - Date.now();
      return expiresIn > 0 && expiresIn < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  const createAPIKey = async (request: CreateAPIKeyRequest): Promise<{ key: APIKey; fullKey: string }> => {
    const response = await mcpRouterKeysApi.create<{ api_key: APIKey; full_key: string }>(request);
    setAPIKeys(prev => [response.api_key, ...prev]);
    return { key: response.api_key, fullKey: response.full_key };
  };

  const revokeAPIKey = async (id: string, reason?: string) => {
    await mcpRouterKeysApi.revoke(id, reason);
    setAPIKeys(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, is_active: false, revoked_at: new Date().toISOString(), revoked_reason: reason }
          : k
      )
    );
  };

  const reactivateAPIKey = async (id: string) => {
    await mcpRouterKeysApi.reactivate(id);
    setAPIKeys(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, is_active: true, revoked_at: undefined, revoked_reason: undefined }
          : k
      )
    );
  };

  const deleteAPIKey = async (id: string) => {
    await mcpRouterKeysApi.remove(id);
    setAPIKeys(prev => prev.filter(k => k.id !== id));
  };

  const updateAPIKey = async (id: string, updates: Partial<APIKey>) => {
    const response = await mcpRouterKeysApi.update<{ api_key: APIKey }>(id, {
      name: updates.name,
      description: updates.description,
      rate_limit_per_minute: updates.rate_limit_per_minute,
      rate_limit_per_day: updates.rate_limit_per_day,
    });
    setAPIKeys(prev => prev.map(k => (k.id === id ? response.api_key : k)));
  };

  return {
    apiKeys,
    stats,
    loading,
    error,
    createAPIKey,
    revokeAPIKey,
    reactivateAPIKey,
    deleteAPIKey,
    updateAPIKey,
    refresh: fetchAPIKeys,
  };
}

export default useAPIKeys;
