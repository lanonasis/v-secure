// Hook for managing API keys with real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAPIKeys([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('api_keys')
        .select(`
          *,
          scopes:api_key_scopes(
            *,
            service:mcp_service_catalog(*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setAPIKeys((data || []).map(mapAPIKeyFromDB));
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate the API key
    const prefix = 'lms_prod';
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const fullKey = `${prefix}_${randomPart}`;
    const keyPrefix = fullKey.substring(0, 12);

    // Hash the key for storage (never store the raw key)
    const encoder = new TextEncoder();
    const data = encoder.encode(fullKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Note: The full key is only returned to the user once and never stored.
    // We only store the hash for verification and a prefix for identification.
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .insert([{
        user_id: user.id,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: request.name,
        description: request.description,
        // Do NOT store the full key - only the hash is persisted
        scope_type: request.scope_type,
        allowed_environments: request.allowed_environments || ['production'],
        rate_limit_per_minute: request.rate_limit_per_minute || 60,
        rate_limit_per_day: request.rate_limit_per_day || 10000,
        is_active: true,
      }])
      .select(`
        *,
        scopes:api_key_scopes(
          *,
          service:mcp_service_catalog(*)
        )
      `)
      .single();

    if (apiKeyError) throw new Error(apiKeyError.message);

    // Create scopes if specific
    if (request.scope_type === 'specific' && request.service_keys?.length) {
      const scopes = request.service_keys.map(serviceKey => ({
        api_key_id: apiKeyData.id,
        service_key: serviceKey,
      }));

      await supabase.from('api_key_scopes').insert(scopes);
    }

    const newKey = mapAPIKeyFromDB(apiKeyData);
    setAPIKeys(prev => [newKey, ...prev]);
    return { key: newKey, fullKey };
  };

  const revokeAPIKey = async (id: string, reason?: string) => {
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    setAPIKeys(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, is_active: false, revoked_at: new Date().toISOString(), revoked_reason: reason }
          : k
      )
    );
  };

  const reactivateAPIKey = async (id: string) => {
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: true,
        revoked_at: null,
        revoked_reason: null,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    setAPIKeys(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, is_active: true, revoked_at: undefined, revoked_reason: undefined }
          : k
      )
    );
  };

  const deleteAPIKey = async (id: string) => {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    setAPIKeys(prev => prev.filter(k => k.id !== id));
  };

  const updateAPIKey = async (id: string, updates: Partial<APIKey>) => {
    const { error } = await supabase
      .from('api_keys')
      .update({
        name: updates.name,
        description: updates.description,
        rate_limit_per_minute: updates.rate_limit_per_minute,
        rate_limit_per_day: updates.rate_limit_per_day,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    setAPIKeys(prev =>
      prev.map(k =>
        k.id === id
          ? { ...k, ...updates, updated_at: new Date().toISOString() }
          : k
      )
    );
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

function mapAPIKeyFromDB(row: any): APIKey {
  return {
    id: row.id,
    user_id: row.user_id,
    key_prefix: row.key_prefix,
    key_hash: row.key_hash,
    name: row.name,
    description: row.description,
    // Note: encrypted_key is intentionally not included - keys are hashed, not stored
    encrypted_key: '', // Placeholder - actual key is never stored
    scope_type: row.scope_type,
    allowed_environments: row.allowed_environments || [],
    rate_limit_per_minute: row.rate_limit_per_minute,
    rate_limit_per_day: row.rate_limit_per_day,
    allowed_ips: row.allowed_ips || [],
    expires_at: row.expires_at,
    last_used_at: row.last_used_at,
    last_used_ip: row.last_used_ip,
    is_active: row.is_active,
    revoked_at: row.revoked_at,
    revoked_reason: row.revoked_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    scopes: row.scopes?.map((s: any) => ({
      id: s.id,
      api_key_id: s.api_key_id,
      service_key: s.service_key,
      allowed_actions: s.allowed_actions || [],
      max_calls_per_minute: s.max_calls_per_minute,
      max_calls_per_day: s.max_calls_per_day,
      created_at: s.created_at,
      service: s.service,
    })),
  };
}

export default useAPIKeys;
