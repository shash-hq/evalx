import contestQueue from '../queues/contest.queue.js';
import Contest from '../models/Contest.js';
import { maybeScheduleContestClose } from '../services/contestLifecycle.service.js';
import { publishRealtimeEvent } from '../services/realtime.service.js';
import logger from '../utils/logger.js';

contestQueue.process('transition', async (job) => {
  const { contestId, targetStatus } = job.data;

  const contest = await Contest.findById(contestId);
  if (!contest) throw new Error(`Contest ${contestId} not found`);

  // Guard: only allow valid forward transitions
  const validTransitions = {
    upcoming: 'live',
    live: 'judging',
    judging: 'closed',
  };

  if (validTransitions[contest.status] !== targetStatus) {
    logger.warn({ contestId, currentStatus: contest.status, targetStatus }, 'Skipping invalid contest transition');
    return { skipped: true };
  }

  contest.status = targetStatus;
  await contest.save();

  logger.info({ contestId, targetStatus }, 'Contest transitioned');

  try {
    await publishRealtimeEvent({
      type: 'contest:status',
      contestId: contestId.toString(),
      payload: { contestId, status: targetStatus },
    });
  } catch (err) {
    logger.error({ err: err.message, contestId }, 'Realtime publish failed — non-fatal');
  }

  if (targetStatus === 'live') {
    const delay = new Date(contest.endTime).getTime() - Date.now();
    if (delay > 0) {
      await contestQueue.add(
        'transition',
        { contestId, targetStatus: 'judging' },
        { delay, jobId: `judging:${contestId}` }
      );
      logger.info({ contestId, delayMinutes: Math.round(delay / 60000) }, 'Scheduled judging transition');
    }
  }

  if (targetStatus === 'judging') {
    await maybeScheduleContestClose(contestId);
  }

  return { status: targetStatus };
});

contestQueue.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Contest job failed');
});

logger.info('Contest worker online');
