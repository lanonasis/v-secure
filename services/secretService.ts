import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service to store and retrieve secrets (key/value) in the database.
 */
export class SecretService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
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
