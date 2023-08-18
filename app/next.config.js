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
