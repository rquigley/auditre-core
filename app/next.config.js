/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
  // The webpack config below is to allow pdfjs to work. It otherwise kills the server
  // saying canvas is not found.
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack },
  ) => {
    // Avoid AWS SDK Node.js require issue
    if (isServer && nextRuntime === 'nodejs') {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(aws-crt|@aws-sdk\/signature-v4-crt)$/,
        }),
      );
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      //
      canvas: false,
      //encoding: false,
    };
    return config;
  },
};

module.exports = nextConfig;

// Injected content via Sentry wizard below

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,

    org: 'auditre-f7d93af81',
    project: 'javascript-nextjs',
    enabled: process.env.NODE_ENV !== 'development',
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    enabled: process.env.NODE_ENV !== 'development',

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: '/monitoring',

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  },
);
