import mongoose from 'mongoose';
import Submission from '../models/Submission.js';
import LeaderboardEntry from '../models/LeaderboardEntry.js';
import LeaderboardSolve from '../models/LeaderboardSolve.js';

const toContestObjectId = (contestId) => new mongoose.Types.ObjectId(contestId);

const normalizeLeaderboard = (entries) => entries.map((entry, index) => ({
  rank: index + 1,
  userId: entry.userId?._id || entry.userId,
  name: entry.userId?.name || 'Unknown User',
  totalScore: entry.totalScore,
  solvedCount: entry.solvedCount,
  lastSubmission: entry.lastSolvedAt,
}));

const getMaterializedLeaderboard = async (contestId) => {
  const entries = await LeaderboardEntry.find({ contestId })
    .populate('userId', 'name')
    .sort({ totalScore: -1, lastSolvedAt: 1, userId: 1 })
    .lean();

  return normalizeLeaderboard(entries);
};

export const rebuildContestLeaderboard = async (contestId) => {
  const contestObjectId = toContestObjectId(contestId);
  const firstAcceptedSolves = await Submission.aggregate([
    { $match: { contestId: contestObjectId, status: 'accepted' } },
    { $sort: { submittedAt: 1, _id: 1 } },
    {
      $group: {
        _id: { userId: '$userId', problemId: '$problemId' },
        submissionId: { $first: '$_id' },
        score: { $first: '$score' },
        firstAcceptedAt: { $first: '$submittedAt' },
      },
    },
  ]);

  const leaderboardEntries = [];
  const byUser = new Map();

  for (const solve of firstAcceptedSolves) {
    const userKey = solve._id.userId.toString();
    const current = byUser.get(userKey) || {
      contestId: contestObjectId,
      userId: solve._id.userId,
      totalScore: 0,
      solvedCount: 0,
      lastSolvedAt: solve.firstAcceptedAt,
    };

    current.totalScore += solve.score;
    current.solvedCount += 1;
    if (!current.lastSolvedAt || current.lastSolvedAt < solve.firstAcceptedAt) {
      current.lastSolvedAt = solve.firstAcceptedAt;
    }

    byUser.set(userKey, current);
  }

  leaderboardEntries.push(...byUser.values());

  await Promise.all([
    LeaderboardEntry.deleteMany({ contestId: contestObjectId }),
    LeaderboardSolve.deleteMany({ contestId: contestObjectId }),
  ]);

  if (firstAcceptedSolves.length > 0) {
    await LeaderboardSolve.insertMany(firstAcceptedSolves.map((solve) => ({
      contestId: contestObjectId,
      userId: solve._id.userId,
      problemId: solve._id.problemId,
      submissionId: solve.submissionId,
      score: solve.score,
      firstAcceptedAt: solve.firstAcceptedAt,
    })));
  }

  if (leaderboardEntries.length > 0) {
    await LeaderboardEntry.insertMany(leaderboardEntries);
  }

  return getMaterializedLeaderboard(contestId);
};

export const ensureContestLeaderboardHydrated = async (contestId) => {
  const [acceptedCount, entryCount, solveCount] = await Promise.all([
    Submission.countDocuments({ contestId, status: 'accepted' }),
    LeaderboardEntry.countDocuments({ contestId }),
    LeaderboardSolve.countDocuments({ contestId }),
  ]);

  if (acceptedCount === 0) {
    if (entryCount > 0 || solveCount > 0) {
      await Promise.all([
        LeaderboardEntry.deleteMany({ contestId }),
        LeaderboardSolve.deleteMany({ contestId }),
      ]);
    }

    return [];
  }

  if (entryCount === 0 || solveCount === 0) {
    return rebuildContestLeaderboard(contestId);
  }

  return null;
};

export const getLeaderboardSnapshot = async (contestId) => {
  const hydrated = await ensureContestLeaderboardHydrated(contestId);
  if (hydrated) {
    return hydrated;
  }

  return getMaterializedLeaderboard(contestId);
};

export const recordAcceptedSolve = async ({
  contestId,
  userId,
  problemId,
  submissionId,
  score,
  submittedAt,
}) => {
  let result;

  try {
    result = await LeaderboardSolve.updateOne(
      { contestId, userId, problemId },
      {
        $setOnInsert: {
          contestId,
          userId,
          problemId,
          submissionId,
          score,
          firstAcceptedAt: submittedAt,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return { isNewSolve: false };
    }

    throw error;
  }

  const isNewSolve = Boolean(result?.upsertedCount || result?.upsertedId);

  if (!isNewSolve) {
    return { isNewSolve: false };
  }

  await LeaderboardEntry.updateOne(
    { contestId, userId },
    {
      $setOnInsert: { contestId, userId },
      $inc: { totalScore: score, solvedCount: 1 },
      $max: { lastSolvedAt: submittedAt },
    },
    { upsert: true }
  );

  return { isNewSolve: true };
};
