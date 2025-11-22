/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib': path.resolve(__dirname, 'src/app/lib'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;

