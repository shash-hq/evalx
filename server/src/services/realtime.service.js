import redis, { getRuntimeServiceName, waitForRedisReady } from '../config/redis.js';
import logger from '../utils/logger.js';

const REALTIME_CHANNEL = process.env.REALTIME_CHANNEL || 'evalx:realtime';

let subscriber = null;
let bridgeAttached = false;

const safeParseEvent = (rawMessage) => {
  try {
    return JSON.parse(rawMessage);
  } catch (error) {
    logger.warn({ err: error?.message, rawMessage }, 'Skipping malformed realtime event payload');
    return null;
  }
};

const routeRealtimeEvent = (io, event) => {
  switch (event?.type) {
    case 'submission:result':
      if (event.userId) {
        io.to(`user:${event.userId}`).emit('submission:result', event.payload);
      }
      return;
    case 'leaderboard:update':
      if (event.contestId) {
        io.to(`contest:${event.contestId}`).emit('leaderboard:update', event.payload);
      }
      return;
    case 'contest:status':
      if (event.contestId) {
        io.to(`contest:${event.contestId}`).emit('contest:status', event.payload);
      }
      return;
    default:
      logger.warn({ type: event?.type }, 'Skipping unknown realtime event type');
  }
};

export const publishRealtimeEvent = async (event) => {
  if (!event?.type) {
    throw new Error('Realtime event type is required');
  }

  if (redis.status !== 'ready') {
    await waitForRedisReady(redis);
  }

  await redis.publish(REALTIME_CHANNEL, JSON.stringify({
    ...event,
    publishedAt: new Date().toISOString(),
  }));
};

export const attachRealtimeBridge = async (io) => {
  if (bridgeAttached) {
    return subscriber;
  }

  subscriber = redis.duplicate({
    connectionName: `${getRuntimeServiceName()}-realtime-subscriber`,
  });

  subscriber.on('error', (error) => {
    logger.error({
      redis: {
        name: error?.name || 'UnknownError',
        message: error?.message || null,
        code: error?.code || null,
      },
    }, 'Realtime subscriber error');
  });

  subscriber.on('message', (_channel, rawMessage) => {
    const event = safeParseEvent(rawMessage);
    if (!event) return;

    try {
      routeRealtimeEvent(io, event);
    } catch (error) {
      logger.error({ err: error?.message, eventType: event?.type }, 'Realtime bridge dispatch failed');
    }
  });

  await waitForRedisReady(subscriber);
  await subscriber.subscribe(REALTIME_CHANNEL);
  bridgeAttached = true;

  logger.info({ channel: REALTIME_CHANNEL }, 'Realtime bridge attached');
  return subscriber;
};
