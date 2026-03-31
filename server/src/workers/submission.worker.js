import submissionQueue from '../queues/submission.queue.js';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import { judgeSubmission } from '../services/judge.service.js';
import { maybeScheduleContestClose } from '../services/contestLifecycle.service.js';
import { getLeaderboardSnapshot, recordAcceptedSolve } from '../services/leaderboard.service.js';
import { publishRealtimeEvent } from '../services/realtime.service.js';
import logger from '../utils/logger.js';

submissionQueue.process(5, async (job) => {
  const { submissionId } = job.data;

  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error(`Submission ${submissionId} not found`);

  const problem = await Problem.findById(submission.problemId);
  if (!problem) throw new Error(`Problem ${submission.problemId} not found`);

  submission.status = 'processing';
  await submission.save();

  let testResults = [];
  let finalStatus = 'accepted';
  let totalScore = 0;
  let executionTime = 0;
  let memoryUsed = 0;
  let isFirstAccepted = false;

  try {
    const judgeResult = await judgeSubmission({
      language: submission.language,
      sourceCode: submission.code,
      testCases: problem.testCases,
      timeLimitMs: problem.timeLimit,
      memoryLimitMb: problem.memoryLimit,
    });

    finalStatus = judgeResult.status;
    executionTime = judgeResult.executionTime;
    memoryUsed = judgeResult.memoryUsed;
    testResults = judgeResult.testResults.map((result) => ({
      testCaseIndex: result.testCaseIndex,
      passed: result.passed,
      time: result.time,
      memory: result.memory,
      stderr: result.stderr,
    }));
  } catch (err) {
    finalStatus = 'runtime_error';
    testResults = [{
      testCaseIndex: 0,
      passed: false,
      time: 0,
      memory: 0,
      stderr: err.message,
    }];
  }

  submission.status = finalStatus;
  submission.testResults = testResults;
  submission.score = totalScore;
  submission.executionTime = executionTime;
  submission.memoryUsed = memoryUsed;
  submission.isFirstAccepted = false;
  submission.processedAt = new Date();
  await submission.save();

  if (finalStatus === 'accepted') {
    try {
      const solveResult = await recordAcceptedSolve({
        contestId: submission.contestId,
        userId: submission.userId,
        problemId: submission.problemId,
        submissionId: submission._id,
        score: problem.points,
        submittedAt: submission.submittedAt,
      });

      isFirstAccepted = solveResult.isNewSolve;
      totalScore = isFirstAccepted ? problem.points : 0;

      submission.score = totalScore;
      submission.isFirstAccepted = isFirstAccepted;
      await submission.save();
    } catch (error) {
      logger.error({ err: error.message, submissionId }, 'Failed to persist accepted solve');
    }
  }

  try {
    await publishRealtimeEvent({
      type: 'submission:result',
      userId: submission.userId.toString(),
      payload: {
        submissionId: submission._id,
        status: finalStatus,
        score: totalScore,
        testResults,
      },
    });

    if (finalStatus === 'accepted' && isFirstAccepted) {
      const leaderboard = await getLeaderboardSnapshot(submission.contestId.toString());
      await publishRealtimeEvent({
        type: 'leaderboard:update',
        contestId: submission.contestId.toString(),
        payload: leaderboard,
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Realtime publish failed — non-fatal');
  }

  await maybeScheduleContestClose(submission.contestId.toString());

  return { status: finalStatus, score: totalScore };
});

submissionQueue.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Submission job failed');

  try {
    const submissionId = job?.data?.submissionId;
    if (!submissionId) return;

    const submission = await Submission.findById(submissionId);
    if (!submission || !['queued', 'processing'].includes(submission.status)) return;

    submission.status = 'runtime_error';
    submission.score = 0;
    submission.executionTime = 0;
    submission.memoryUsed = 0;
    submission.isFirstAccepted = false;
    submission.processedAt = new Date();
    submission.testResults = [{
      testCaseIndex: 0,
      passed: false,
      time: 0,
      memory: 0,
      stderr: err.message,
    }];
    await submission.save();

    await publishRealtimeEvent({
      type: 'submission:result',
      userId: submission.userId.toString(),
      payload: {
        submissionId: submission._id,
        status: submission.status,
        score: submission.score,
        testResults: submission.testResults,
      },
    });

    await maybeScheduleContestClose(submission.contestId.toString());
  } catch (recoveryError) {
    logger.error({
      submissionId: job?.data?.submissionId,
      err: recoveryError.message,
    }, 'Failed to recover submission after queue failure');
  }
});

submissionQueue.on('completed', (job, result) => {
  logger.info({ jobId: job.id, status: result.status, score: result.score }, 'Submission job completed');
});

logger.info('Submission worker online');
