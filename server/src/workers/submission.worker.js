import submissionQueue from '../queues/submission.queue.js';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import { judgeSubmission } from '../services/judge.service.js';
import { getIO } from '../config/socket.js';
import { buildLeaderboard } from '../controllers/contest.controller.js';

submissionQueue.process(5, async (job) => {
  const { submissionId } = job.data;

  const submission = await Submission.findById(submissionId);
  if (!submission) throw new Error(`Submission ${submissionId} not found`);

  const problem = await Problem.findById(submission.problemId);
  if (!problem) throw new Error(`Problem ${submission.problemId} not found`);

  // Mark as processing
  submission.status = 'processing';
  await submission.save();

  let testResults = [];
  let finalStatus = 'accepted';
  let totalScore = 0;
  let executionTime = 0;
  let memoryUsed = 0;

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

  if (finalStatus === 'accepted') {
    totalScore = problem.points;

    // Check if this is first accepted for this problem by this user in this contest
    const previousAccepted = await Submission.findOne({
      userId: submission.userId,
      problemId: submission.problemId,
      contestId: submission.contestId,
      status: 'accepted',
      _id: { $ne: submission._id },
    });

    if (!previousAccepted) {
      submission.isFirstAccepted = true;
    }
  }

  submission.status = finalStatus;
  submission.testResults = testResults;
  submission.score = totalScore;
  submission.executionTime = executionTime;
  submission.memoryUsed = memoryUsed;
  submission.processedAt = new Date();
  await submission.save();

  // Emit result to the submitting user's socket room
  try {
    const io = getIO();
    io.to(`user:${submission.userId}`).emit('submission:result', {
      submissionId: submission._id,
      status: finalStatus,
      score: totalScore,
      testResults,
    });

    // Broadcast leaderboard update to contest room
    if (finalStatus === 'accepted') {
      const leaderboard = await buildLeaderboard(submission.contestId.toString());
      io.to(`contest:${submission.contestId}`).emit('leaderboard:update', leaderboard);
    }
  } catch (err) {
    console.error('Socket emit failed:', err.message);
    // Non-fatal — submission is already saved
  }

  return { status: finalStatus, score: totalScore };
});

submissionQueue.on('failed', (job, err) => {
  console.error(`Submission job ${job.id} failed:`, err.message);
});

submissionQueue.on('completed', (job, result) => {
  console.log(`Submission job ${job.id} completed:`, result.status);
});

console.log('Submission worker online');
