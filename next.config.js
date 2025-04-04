/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000', '1kgithub.com']
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 