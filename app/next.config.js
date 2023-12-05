/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  // logging: {
  //   level: 'verbose',
  //   fullUrl: true,
  // },
  images: {
    remotePatterns: [
      // OAuth User Profile Images
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        // port: '',
        // pathname: '',
      },
      // Uncomment if needed in dev
      // {
      //   protocol: 'https',
      //   hostname: 'images.unsplash.com',
      // },
    ],
  },
  // webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  // The webpack config below is to allow pdfjs to work. It otherwise kills the server
  // saying canvas is not found.
  // webpack: (config) => {
  //   config.resolve.alias = {
  //     ...config.resolve.alias,

  //     canvas: false,
  //     //encoding: false,
  //   };
  //   return config;
  // },
  generateBuildId: async () => {
    console.log('build id', process.env.GITHUB_SHA);
    return process.env.GITHUB_SHA;
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
    project: 'app',
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
