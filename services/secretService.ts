import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service to store and retrieve secrets (key/value) in the database.
 */
export class SecretService {
  private supabase: SupabaseClient;

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env variables');
    }
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
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
