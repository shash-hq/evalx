import Bull from 'bull';

const redisConfig = process.env.NODE_ENV === 'production'
  ? { redis: process.env.REDIS_URL, settings: { stalledInterval: 30000 } }
  : { redis: process.env.REDIS_URL };

const contestQueue = new Bull('contests', {
  ...redisConfig,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
  },
});

export default contestQueue;
