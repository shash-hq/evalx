import Contest from '../models/Contest.js';
import Submission from '../models/Submission.js';
import contestQueue from '../queues/contest.queue.js';
import logger from '../utils/logger.js';

export const maybeScheduleContestClose = async (contestId, { delayMs = 5000 } = {}) => {
  const contest = await Contest.findById(contestId).select('status');

  if (!contest || contest.status !== 'judging') {
    return { scheduled: false, reason: 'not_judging' };
  }

  const pendingCount = await Submission.countDocuments({
    contestId: contest._id,
    status: { $in: ['queued', 'processing'] },
  });

  if (pendingCount > 0) {
    return { scheduled: false, pendingCount };
  }

  const closeJobId = `closed:${contest._id}`;
  const existingJob = await contestQueue.getJob(closeJobId);

  if (existingJob) {
    return { scheduled: true, existing: true, pendingCount: 0 };
  }

  await contestQueue.add(
    'transition',
    { contestId: contest._id.toString(), targetStatus: 'closed' },
    { delay: delayMs, jobId: closeJobId }
  );

  logger.info({ contestId: contest._id.toString(), delayMs }, 'Scheduled contest close');

  return { scheduled: true, existing: false, pendingCount: 0 };
};
