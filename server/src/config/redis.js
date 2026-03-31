import Redis from 'ioredis';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || '';

export const getRuntimeServiceName = () =>
  process.env.SERVICE_NAME ||
  process.env.RENDER_SERVICE_NAME ||
  process.env.RAILWAY_SERVICE_NAME ||
  'evalx-api';

const formatRedisError = (error) => ({
  name: error?.name || 'UnknownError',
  message: error?.message || null,
  code: error?.code || null,
});

const parseRedisUrl = (value) => {
  if (!value) {
    throw new Error('REDIS_URL is not configured');
  }

  const parsed = new URL(value);
  const isTls = parsed.protocol === 'rediss:' || process.env.REDIS_TLS === 'true';

  return {
    connectionName: getRuntimeServiceName(),
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname ? Number(parsed.pathname.replace('/', '') || 0) : 0,
    family: 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  };
};

export const getRedisClientOptions = () => parseRedisUrl(REDIS_URL);

export const getBullRedisOptions = () => {
  const { lazyConnect, ...options } = getRedisClientOptions();
  return options;
};

export const waitForRedisReady = async (client, timeoutMs = 10000) => {
  if (client.status === 'ready') return;

  await Promise.race([
    new Promise((resolve, reject) => {
      const handleReady = () => {
        cleanup();
        resolve();
      };

      const handleError = (error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        client.off('ready', handleReady);
        client.off('error', handleError);
      };

      client.on('ready', handleReady);
      client.on('error', handleError);
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Redis readiness timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
};

const redis = new Redis(getRedisClientOptions());

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('reconnecting', () => logger.warn('Redis reconnecting'));
redis.on('error', (error) => logger.error({ redis: formatRedisError(error) }, 'Redis error'));

export default redis;
