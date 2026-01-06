const { withMicrofrontends } = require('@vercel/microfrontends/next/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
}

module.exports = withMicrofrontends(nextConfig)
