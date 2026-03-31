import Bull from 'bull';
import { getBullRedisOptions } from '../config/redis.js';

const redisConfig = {
  redis: getBullRedisOptions(),
  settings: { stalledInterval: 30000 },
};

const submissionQueue = new Bull('submissions', {
  ...redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

submissionQueue.on('error', (error) => {
  console.error('Submission queue error:', {
    name: error?.name || 'UnknownError',
    message: error?.message || null,
    code: error?.code || null,
  });
});

export default submissionQueue;
