import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  // Exchange code for session
  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }

    // Successful authentication - redirect to dashboard or next page
    const dashboardUrl = new URL(next, requestUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  // No code provided - redirect to login
  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'No authorization code provided');
  return NextResponse.redirect(loginUrl);
}
