import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

const parseRedisUrl = (value) => {
  if (!value) {
    throw new Error('REDIS_URL is not configured');
  }

  const parsed = new URL(value);
  const isTls = parsed.protocol === 'rediss:' || process.env.REDIS_TLS === 'true';

  return {
    connectionName: process.env.RAILWAY_SERVICE_NAME || 'evalx-api',
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname ? Number(parsed.pathname.replace('/', '') || 0) : 0,
    family: 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    ...(isTls ? { tls: {} } : {}),
  };
};

const formatRedisError = (error) => ({
  name: error?.name || 'UnknownError',
  message: error?.message || null,
  code: error?.code || null,
});

export const getRedisClientOptions = () => parseRedisUrl(REDIS_URL);

export const getBullRedisOptions = () => {
  const { lazyConnect, ...options } = getRedisClientOptions();
  return options;
};

const redis = new Redis(getRedisClientOptions());

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('ready', () => {
  console.log('Redis ready');
});

redis.on('reconnecting', () => {
  console.warn('Redis reconnecting');
});

redis.on('error', (error) => {
  console.error('Redis error:', formatRedisError(error));
});

export default redis;
