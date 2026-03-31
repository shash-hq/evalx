import Bull from 'bull';
import logger from '../utils/logger.js';
import { getBullRedisOptions } from '../config/redis.js';

const contestQueue = new Bull('contests', {
  redis: getBullRedisOptions(),
  settings: { stalledInterval: 30000 },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
  },
});

contestQueue.on('error', (error) => {
  logger.error({
    queue: 'contests',
    error: {
      name: error?.name || 'UnknownError',
      message: error?.message || null,
      code: error?.code || null,
    },
  }, 'Contest queue error');
});

export default contestQueue;
