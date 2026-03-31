import Bull from 'bull';
import logger from '../utils/logger.js';
import { getBullRedisOptions } from '../config/redis.js';

const submissionQueue = new Bull('submissions', {
  redis: getBullRedisOptions(),
  settings: { stalledInterval: 30000 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

submissionQueue.on('error', (error) => {
  logger.error({
    queue: 'submissions',
    error: {
      name: error?.name || 'UnknownError',
      message: error?.message || null,
      code: error?.code || null,
    },
  }, 'Submission queue error');
});

export default submissionQueue;
