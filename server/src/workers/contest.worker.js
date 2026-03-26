import contestQueue from '../queues/contest.queue.js';
import Contest from '../models/Contest.js';
import Submission from '../models/Submission.js';
import { getIO } from '../config/socket.js';

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
    console.warn(`Skipping transition: ${contest.status} → ${targetStatus} not valid`);
    return { skipped: true };
  }

  contest.status = targetStatus;
  await contest.save();

  console.log(`Contest ${contestId} transitioned to: ${targetStatus}`);

  // Notify all clients in contest room
  try {
    const io = getIO();
    io.to(`contest:${contestId}`).emit('contest:status', { contestId, status: targetStatus });
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  // When contest goes live → schedule judging transition
  if (targetStatus === 'live') {
    const delay = new Date(contest.endTime).getTime() - Date.now();
    if (delay > 0) {
      await contestQueue.add(
        'transition',
        { contestId, targetStatus: 'judging' },
        { delay, jobId: `judging:${contestId}` }
      );
      console.log(`Scheduled judging transition for ${contestId} in ${Math.round(delay / 60000)}m`);
    }
  }

  // When contest enters judging → check if all submissions processed, then close
  if (targetStatus === 'judging') {
    await checkAndClose(contestId);
  }

  return { status: targetStatus };
});

// Poll every 30s until queue drains, then close
const checkAndClose = async (contestId) => {
  const pendingCount = await Submission.countDocuments({
    contestId,
    status: { $in: ['queued', 'processing'] },
  });

  if (pendingCount === 0) {
    await contestQueue.add(
      'transition',
      { contestId, targetStatus: 'closed' },
      { delay: 5000, jobId: `closed:${contestId}` }
    );
  } else {
    console.log(`${pendingCount} submissions still pending for ${contestId}, rechecking in 30s`);
    await contestQueue.add(
      'check-close',
      { contestId },
      { delay: 30000, jobId: `check-close:${contestId}:${Date.now()}` }
    );
  }
};

contestQueue.process('check-close', async (job) => {
  await checkAndClose(job.data.contestId);
});

contestQueue.on('failed', (job, err) => {
  console.error(`Contest job ${job.id} failed:`, err.message);
});

console.log('Contest worker online');
