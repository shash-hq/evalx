import Bull from 'bull';

const redisConfig = process.env.NODE_ENV === 'production'
  ? {
      redis: process.env.REDIS_URL,
      settings: { stalledInterval: 30000 },
    }
  : { redis: process.env.REDIS_URL };

const submissionQueue = new Bull('submissions', {
  ...redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export default submissionQueue;
