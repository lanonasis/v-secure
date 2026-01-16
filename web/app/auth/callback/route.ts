import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Dashboard URL based on environment
const DASHBOARD_URL = process.env.NODE_ENV === 'production'
  ? 'https://dashboard.lanonasis.com'
  : '/dashboard';

// Cookie domain for cross-subdomain auth
const COOKIE_DOMAIN = process.env.NODE_ENV === 'production' ? '.lanonasis.com' : undefined;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || DASHBOARD_URL;

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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set cookie on parent domain for cross-subdomain sharing
            cookieStore.set({
              name,
              value,
              ...options,
              ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
            });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({
              name,
              ...options,
              ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
            });
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
    // Handle both absolute URLs (https://secureme.lanonasis.com) and relative paths (/dashboard)
    const redirectUrl = next.startsWith('http')
      ? next
      : new URL(next, requestUrl.origin).toString();
    return NextResponse.redirect(redirectUrl);
  }

  // No code provided - redirect to login
  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'No authorization code provided');
  return NextResponse.redirect(loginUrl);
}
