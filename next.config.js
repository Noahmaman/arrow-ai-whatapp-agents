/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow larger request bodies (for saving campaigns with many contacts)
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
