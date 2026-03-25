import Bull from 'bull';

const submissionQueue = new Bull('submissions', {
  redis: process.env.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // keep last 100 completed jobs
    removeOnFail: 50,
  },
});

export default submissionQueue;
