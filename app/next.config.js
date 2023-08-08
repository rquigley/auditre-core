/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // The webpack config below is to allow pdfjs to work. It otherwise kills the server
  // saying canvas is not found.
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack },
  ) => {
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
