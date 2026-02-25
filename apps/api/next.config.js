/** @type {import('next').NextConfig} */
const path = require('path');
const webpack = require('webpack');

const LIBS = path.resolve(__dirname, '../../libs');

// Mirror tsconfig.base.json paths for webpack
const pathMappings = [
  // /internal subpaths first (more specific)
  ['@tiny-store/modules-inventory/internal', 'modules/inventory/src/internal.ts'],
  ['@tiny-store/modules-orders/internal', 'modules/orders/src/internal.ts'],
  ['@tiny-store/modules-payments/internal', 'modules/payments/src/internal.ts'],
  ['@tiny-store/modules-shipments/internal', 'modules/shipments/src/internal.ts'],
  // Public APIs
  ['@tiny-store/modules-inventory', 'modules/inventory/src/index.ts'],
  ['@tiny-store/modules-orders', 'modules/orders/src/index.ts'],
  ['@tiny-store/modules-payments', 'modules/payments/src/index.ts'],
  ['@tiny-store/modules-shipments', 'modules/shipments/src/index.ts'],
  ['@tiny-store/shared-infrastructure', 'shared/infrastructure/src/index.ts'],
  ['@tiny-store/shared-domain', 'shared/domain/src/index.ts'],
];

const nextConfig = {
  serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib': path.resolve(__dirname, 'src/app/lib'),
      };

      // Use NormalModuleReplacementPlugin for @tiny-store/* paths
      for (const [from, to] of pathMappings) {
        const escaped = from.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(
            new RegExp(`^${escaped}$`),
            path.join(LIBS, to)
          )
        );
      }

      if (!config.resolve.extensions.includes('.ts')) {
        config.resolve.extensions.push('.ts');
      }
    }
    return config;
  },
};

module.exports = nextConfig;
