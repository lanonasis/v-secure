// Hook for secrets management with real Supabase data
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Secret } from '../types/secrets';

interface SecretsStats {
  total: number;
  active: number;
  rotationDue: number;
  compromised: number;
}

interface UseSecretsReturn {
  secrets: Secret[];
  stats: SecretsStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSecrets(environment?: string): UseSecretsReturn {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecrets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('secrets')
        .select(`
          *,
          rotation_policies (
            frequency_days,
            next_rotation,
            auto_rotate
          )
        `)
        .order('created_at', { ascending: false });

      if (environment && environment !== 'all') {
        query = query.eq('environment', environment);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setSecrets(data || []);
    } catch (err: any) {
      setError(err.message);
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  const stats: SecretsStats = {
    total: secrets.length,
    active: secrets.filter(s => s.status === 'active').length,
    rotationDue: secrets.filter(s => {
      if (!s.last_rotated) return false;
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return new Date(s.last_rotated) < ninetyDaysAgo;
    }).length,
    compromised: secrets.filter(s => s.status === 'compromised').length,
  };

  return {
    secrets,
    stats,
    loading,
    error,
    refresh: fetchSecrets,
  };
}

export default useSecrets;
