// VortexShield - Supabase Client Configuration
import { createBrowserClient } from '@supabase/ssr';

// Extract base Supabase URL from potentially full edge function URL
// e.g., "https://project.supabase.co/functions/v1/ai-chat" -> "https://project.supabase.co"
function extractBaseSupabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // If it includes /functions/, extract just the base URL
  const functionsIndex = url.indexOf('/functions/');
  if (functionsIndex > 0) {
    return url.substring(0, functionsIndex);
  }

  return url;
}

// Environment validation
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = extractBaseSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL is not configured. Auth features will be disabled.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Auth features will be disabled.');
}

// Create Supabase client for browser
export function createClient() {
  return createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  );
}

// Default client instance
export const supabase = createClient();

// Auth helper functions
export async function signInWithProvider(provider: 'github' | 'google') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, metadata?: Record<string, unknown>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const baseUrl = supabaseUrl;
  return Boolean(
    baseUrl &&
    !baseUrl.includes('placeholder') &&
    !baseUrl.includes('your-project') &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'placeholder-key' &&
    supabaseAnonKey !== 'your_supabase_anon_key'
  );
}
