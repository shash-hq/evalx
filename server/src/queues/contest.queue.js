import Bull from 'bull';
import { getBullRedisOptions } from '../config/redis.js';

const redisConfig = {
  redis: getBullRedisOptions(),
  settings: { stalledInterval: 30000 },
};

const contestQueue = new Bull('contests', {
  ...redisConfig,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
  },
});

contestQueue.on('error', (error) => {
  console.error('Contest queue error:', {
    name: error?.name || 'UnknownError',
    message: error?.message || null,
    code: error?.code || null,
  });
});

export default contestQueue;
