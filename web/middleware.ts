import type { NextRequest } from 'next/server';
import { runMicrofrontendsMiddleware } from '@vercel/microfrontends/next/middleware';

export async function middleware(request: NextRequest) {
  // Run the microfrontends middleware to handle path-based routing
  // Routes /dashboard/* to the vortex-secure application
  const response = await runMicrofrontendsMiddleware({
    request,
    flagValues: {},
  });

  if (response) {
    return response;
  }
}

// Define routes where this middleware should apply
export const config = {
  matcher: [
    // Required for microfrontends client config and prefetch optimizations
    '/.well-known/vercel/microfrontends/:path*',
    // Dashboard routes handled by vortex-secure microfrontend
    '/dashboard',
    '/dashboard/:path*',
  ],
};
