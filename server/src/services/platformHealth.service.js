import mongoose from 'mongoose';
import redis from '../config/redis.js';
import submissionQueue from '../queues/submission.queue.js';
import contestQueue from '../queues/contest.queue.js';
import { getJudgeServiceHealth, probeJudgeService } from './judge.service.js';
import { getMailServiceHealth } from './mail.service.js';

const MONGOOSE_READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const withTimeout = async (promiseFactory, timeoutMs, timeoutMessage) => {
  const startedAt = Date.now();

  try {
    const result = await Promise.race([
      promiseFactory(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      result,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      result: null,
      error,
    };
  }
};

const getMongoHealth = () => {
  const connection = mongoose.connection;
  const readyState = connection.readyState;
  const status =
    readyState === 1
      ? 'healthy'
      : readyState === 2
        ? 'degraded'
        : 'down';

  return {
    status,
    readyState,
    readyStateLabel: MONGOOSE_READY_STATES[readyState] || 'unknown',
    host: connection.host || null,
    name: connection.name || null,
  };
};

const getRedisHealth = async () => {
  const probe = await withTimeout(
    () => redis.ping(),
    3000,
    'Redis ping timed out'
  );

  return {
    status: probe.ok && probe.result === 'PONG' ? 'healthy' : 'down',
    clientStatus: redis.status,
    latencyMs: probe.latencyMs,
    error: probe.error?.message || null,
  };
};

const getQueueHealth = async (queueName, queue) => {
  const probe = await withTimeout(
    () => queue.getJobCounts(),
    3000,
    `${queueName} queue probe timed out`
  );

  return {
    status: probe.ok ? 'healthy' : 'down',
    queueName,
    latencyMs: probe.latencyMs,
    counts: probe.result || null,
    error: probe.error?.message || null,
  };
};

const getOverallStatus = (services) => {
  const statuses = Object.values(services).flatMap((service) => {
    if (service && typeof service === 'object' && !Array.isArray(service) && service.status) {
      return [service.status];
    }

    if (service && typeof service === 'object' && !Array.isArray(service)) {
      return Object.values(service)
        .filter((entry) => entry && typeof entry === 'object' && entry.status)
        .map((entry) => entry.status);
    }

    return [];
  });

  if (statuses.includes('down')) return 'down';
  if (statuses.some((status) => status !== 'healthy')) return 'degraded';
  return 'healthy';
};

export const getPlatformHealth = async () => {
  const [redisHealth, submissionQueueHealth, contestQueueHealth, judgeHealth] = await Promise.all([
    getRedisHealth(),
    getQueueHealth('submissions', submissionQueue),
    getQueueHealth('contests', contestQueue),
    probeJudgeService(),
  ]);

  const services = {
    api: {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'development',
    },
    database: getMongoHealth(),
    redis: redisHealth,
    queues: {
      submissions: submissionQueueHealth,
      contests: contestQueueHealth,
    },
    judge: {
      ...getJudgeServiceHealth(),
      ...judgeHealth,
    },
    mail: getMailServiceHealth(),
  };

  return {
    status: getOverallStatus(services),
    checkedAt: new Date().toISOString(),
    services,
  };
};
