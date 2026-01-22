/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // In development, proxy to local vortex-secure dev server
    // In production, proxy to deployed vortex-secure (secureme.lanonasis.com)
    const consoleUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : 'https://vortex-secure.vercel.app';

    return [
      {
        source: '/console',
        destination: `${consoleUrl}/`,
      },
      {
        source: '/console/:path*',
        destination: `${consoleUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
