import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service to store and retrieve secrets (key/value) in the database.
 */
export class SecretService {
  private supabase: SupabaseClient;

  constructor() {
    if (!process.env.SUPABASE_URL=https://<project-ref>.supabase.co
      throw new Error('Missing SUPABASE_URL=https://<project-ref>.supabase.co
    }
    this.supabase = createClient(
      process.env.SUPABASE_URL=https://<project-ref>.supabase.co
      process.env.SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Store or update a secret by key.
   */
  async storeSecret(key: string, value: string): Promise<void> {
    const { error } = await this.supabase
      .from('secrets')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      throw error;
    }
  }

  /**
   * Retrieve a secret value by key.
   */
  async getSecret(key: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('secrets')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data?.value ?? null;
  }
}
