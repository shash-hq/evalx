import contestQueue from '../queues/contest.queue.js';

export const scheduleContestTransitions = async (contest) => {
  const now = Date.now();
  const startDelay = new Date(contest.startTime).getTime() - now;
  const endDelay = new Date(contest.endTime).getTime() - now;

  // Remove any stale jobs for this contest first
  await cancelContestJobs(contest._id.toString());

  if (startDelay > 0) {
    await contestQueue.add(
      'transition',
      { contestId: contest._id.toString(), targetStatus: 'live' },
      { delay: startDelay, jobId: `live:${contest._id}` }
    );
    console.log(`Scheduled live transition for ${contest._id} in ${Math.round(startDelay / 60000)}m`);
  }

  // End transition scheduled here only as fallback
  // Primary scheduling happens inside worker when contest goes live
  if (endDelay > 0) {
    await contestQueue.add(
      'transition',
      { contestId: contest._id.toString(), targetStatus: 'judging' },
      { delay: endDelay, jobId: `judging:${contest._id}` }
    );
  }
};

export const cancelContestJobs = async (contestId) => {
  const jobIds = [`live:${contestId}`, `judging:${contestId}`, `closed:${contestId}`];
  for (const jobId of jobIds) {
    try {
      const job = await contestQueue.getJob(jobId);
      if (job) await job.remove();
    } catch (err) {
      // Job may not exist — safe to ignore
    }
  }
};
