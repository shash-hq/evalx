import { connectDB } from '../config/db.js';
import redis, { waitForRedisReady } from '../config/redis.js';
import submissionQueue from '../queues/submission.queue.js';
import contestQueue from '../queues/contest.queue.js';
import { verifyMailService } from './mail.service.js';

export const waitForQueueReady = async (queue, queueName, timeoutMs = 10000) => {
  await Promise.race([
    queue.isReady(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${queueName} queue readiness timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
};

export const ensureCoreDependenciesReady = async () => {
  await connectDB();
  await waitForRedisReady(redis);
  await redis.ping();

  await Promise.all([
    waitForQueueReady(submissionQueue, 'submission'),
    waitForQueueReady(contestQueue, 'contest'),
  ]);

  return ['database', 'redis', 'submission_queue', 'contest_queue'];
};

export const ensureWebDependenciesReady = async () => {
  const readiness = await ensureCoreDependenciesReady();
  await verifyMailService();
  return [...readiness, 'mail'];
};

export const ensureWorkerDependenciesReady = async () => ensureCoreDependenciesReady();
