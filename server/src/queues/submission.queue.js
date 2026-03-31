import Bull from 'bull';

const submissionQueue = new Bull('submissions', {
  redis: process.env.REDIS_URL,
  settings: { stalledInterval: 30000 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export default submissionQueue;
