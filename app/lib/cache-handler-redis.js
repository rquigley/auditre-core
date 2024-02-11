const { IncrementalCache } = require('@neshca/cache-handler');
const { createHandler } = require('@neshca/cache-handler/redis-stack');
const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
});

client.on('error', (error) => {
  console.error('Redis error:', error.message);
});

IncrementalCache.onCreation(async (options) => {
  await client.connect();

  const getConfig = createHandler({
    client,
    keyPrefix: 'PREFIX',
  });

  return getConfig(options);
});

module.exports = IncrementalCache;
