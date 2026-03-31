import Bull from 'bull';

const contestQueue = new Bull('contests', {
  redis: process.env.REDIS_URL,
  settings: { stalledInterval: 30000 },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
  },
});

export default contestQueue;
