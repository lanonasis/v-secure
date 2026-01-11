const { withMicrofrontends } = require('@vercel/microfrontends/next/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return []
    }

    return [
      {
        source: '/dashboard/:path*',
        destination: 'http://localhost:5173/dashboard/:path*',
      },
    ]
  },
}

module.exports = withMicrofrontends(nextConfig)
