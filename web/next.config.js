/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // In development, proxy to local vortex-secure dev server
    // In production, proxy to deployed vortex-secure
    const dashboardUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : 'https://vortex-secure.vercel.app';

    return [
      {
        source: '/dashboard',
        destination: `${dashboardUrl}/dashboard`,
      },
      {
        source: '/dashboard/:path*',
        destination: `${dashboardUrl}/dashboard/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
