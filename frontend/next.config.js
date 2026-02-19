/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    proxyTimeout: 120000,
  },
}

module.exports = nextConfig
