/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  basePath: '/vortexshield',
  assetPrefix: '/vortexshield',
  images: {
    unoptimized: true,
  },
  output: 'standalone',
}

module.exports = nextConfig
