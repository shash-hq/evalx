import Contest from '../models/Contest.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';
import Registration from '../models/Registration.js';
import Transaction from '../models/Transaction.js';
import { scheduleContestTransitions, cancelContestJobs } from '../services/schedule.service.js';
import { createAuditLog } from '../services/auditLog.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isSuperAdminRole } from '../utils/roles.js';

// GET /api/admin/contests
export const getAllContests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = status ? { status } : {};
  const skip = (Number(page) - 1) * Number(limit);

  const [contests, total] = await Promise.all([
    Contest.find(query)
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Contest.countDocuments(query),
  ]);

  res.json(new ApiResponse(200, {
    contests,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  }));
});

// PUT /api/admin/contests/:id/approve
export const approveContest = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, 'Contest not found');
  if (contest.isApprovedByAdmin) throw new ApiError(400, 'Contest already approved');
  if (contest.status !== 'draft') throw new ApiError(400, 'Only draft contests can be approved');
  if (!contest.problems.length) throw new ApiError(400, 'Contest must have at least one problem');
  const previousStatus = contest.status;

  contest.isApprovedByAdmin = true;
  contest.status = 'upcoming';
  await contest.save();

  // Schedule automated state transitions
  await scheduleContestTransitions(contest);

  await createAuditLog({
    req,
    action: 'contest.approve',
    targetType: 'contest',
    targetId: contest._id,
    targetLabel: contest.title,
    details: {
      previousStatus,
      nextStatus: contest.status,
      organizerId: contest.organizerId,
    },
  });

  res.json(new ApiResponse(200, contest, 'Contest approved and transitions scheduled'));
});

// PUT /api/admin/contests/:id/reject
export const rejectContest = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, 'Contest not found');
  const previousStatus = contest.status;

  contest.isApprovedByAdmin = false;
  contest.status = 'draft';
  await cancelContestJobs(req.params.id);
  await contest.save();

  await createAuditLog({
    req,
    action: 'contest.reject',
    targetType: 'contest',
    targetId: contest._id,
    targetLabel: contest.title,
    details: {
      previousStatus,
      nextStatus: contest.status,
    },
  });

  res.json(new ApiResponse(200, null, 'Contest rejected and returned to draft'));
});

// POST /api/admin/contests/:id/trigger-close
export const triggerClose = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, 'Contest not found');
  if (!['live', 'judging'].includes(contest.status)) {
    throw new ApiError(400, 'Can only force-close live or judging contests');
  }
  const previousStatus = contest.status;

  contest.status = 'closed';
  await contest.save();
  await cancelContestJobs(req.params.id);

  try {
    const { getIO } = await import('../config/socket.js');
    getIO().to(`contest:${req.params.id}`).emit('contest:status', {
      contestId: req.params.id,
      status: 'closed',
    });
  } catch (_) {}

  await createAuditLog({
    req,
    action: 'contest.force_close',
    targetType: 'contest',
    targetId: contest._id,
    targetLabel: contest.title,
    details: {
      previousStatus,
      nextStatus: contest.status,
    },
  });

  res.json(new ApiResponse(200, null, 'Contest force-closed'));
});

// POST /api/admin/contests/:id/payouts
export const processPayouts = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, 'Contest not found');
  if (contest.status !== 'closed') throw new ApiError(400, 'Contest must be closed before payouts');
  if (!contest.prizeDistribution.length) throw new ApiError(400, 'No prize distribution defined');

  const { buildLeaderboard } = await import('./contest.controller.js');
  const leaderboard = await buildLeaderboard(req.params.id);

  const payouts = [];

  for (const prize of contest.prizeDistribution) {
    const winner = leaderboard.find((entry) => entry.rank === prize.rank);
    if (!winner) continue;

    const amount = (prize.percentage / 100) * contest.prizePool;

    await Transaction.create({
      userId: winner.userId,
      contestId: contest._id,
      amount,
      type: 'prize_payout',
      status: 'captured',
    });

    prize.payoutStatus = 'paid';
    payouts.push({ rank: prize.rank, userId: winner.userId, name: winner.name, amount });
  }

  await contest.save();

  await createAuditLog({
    req,
    action: 'contest.process_payouts',
    targetType: 'contest',
    targetId: contest._id,
    targetLabel: contest.title,
    details: {
      payoutCount: payouts.length,
      totalPayoutAmount: payouts.reduce((sum, payout) => sum + payout.amount, 0),
      payouts,
    },
  });

  res.json(new ApiResponse(200, payouts, 'Payouts processed'));
});

// GET /api/admin/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = search ? { $or: [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ]} : {};

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash -otp -otpExpiry -refreshTokenHash -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(query),
  ]);

  res.json(new ApiResponse(200, {
    users,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  }));
});

// PUT /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['contestant', 'organizer', 'admin', 'superadmin'].includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  const existingUser = await User.findById(req.params.id);
  if (!existingUser) throw new ApiError(404, 'User not found');
  const previousRole = existingUser.role;

  if (
    existingUser.role === 'superadmin' &&
    role !== 'superadmin'
  ) {
    const superAdminCount = await User.countDocuments({ role: 'superadmin' });
    if (superAdminCount <= 1) {
      throw new ApiError(400, 'You cannot remove the last superadmin');
    }
  }

  if (
    req.user._id.toString() === req.params.id &&
    isSuperAdminRole(req.user.role) &&
    role !== 'superadmin'
  ) {
    throw new ApiError(400, 'Use another superadmin account before changing your own role');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { returnDocument: 'after' }
  ).select('-passwordHash -otp -otpExpiry -refreshTokenHash -refreshToken');

  await createAuditLog({
    req,
    action: 'user.role_update',
    targetType: 'user',
    targetId: existingUser._id,
    targetLabel: existingUser.email,
    details: {
      previousRole,
      nextRole: role,
    },
  });

  res.json(new ApiResponse(200, user, 'Role updated'));
});

// GET /api/admin/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalContests,
    totalSubmissions,
    pendingApprovals,
    recentRegistrations,
  ] = await Promise.all([
    User.countDocuments(),
    Contest.countDocuments(),
    Submission.countDocuments(),
    Contest.countDocuments({ isApprovedByAdmin: false, status: 'draft' }),
    Registration.countDocuments({
      registeredAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const revenueAgg = await Transaction.aggregate([
    { $match: { type: 'entry_fee', status: 'captured' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  res.json(new ApiResponse(200, {
    totalUsers,
    totalContests,
    totalSubmissions,
    pendingApprovals,
    recentRegistrations,
    totalRevenue: revenueAgg[0]?.total || 0,
  }));
});
