import slugify from 'slugify';
import Contest from '../models/Contest.js';
import Registration from '../models/Registration.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/pagination.js';
import { isAdminRole } from '../utils/roles.js';
import { getLeaderboardSnapshot } from '../services/leaderboard.service.js';


const generateSlug = async (title) => {
  let slug = slugify(title, { lower: true, strict: true });
  let count = 0;
  while (await Contest.findOne({ slug: count ? `${slug}-${count}` : slug })) count++;
  return count ? `${slug}-${count}` : slug;
};

// GET /api/contests
export const getContests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10, search } = req.query;
  const query = { isApprovedByAdmin: true };

  if (status) query.status = status;
  if (search) query.title = { $regex: search, $options: 'i' };

  const pagination = parsePagination(page, limit, 10);

  const [contests, total] = await Promise.all([
    Contest.find(query)
      .populate('organizerId', 'name')
      .sort({ startTime: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Contest.countDocuments(query),
  ]);

  res.json(new ApiResponse(200, {
    contests,
    pagination: {
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
      limit: pagination.limit,
    },
  }));
});

// GET /api/contests/:slug
export const getContestBySlug = asyncHandler(async (req, res) => {
  const contest = await Contest.findOne({ slug: req.params.slug })
    .populate('organizerId', 'name email')
    .lean();

  if (!contest) throw new ApiError(404, 'Contest not found');

  // Strip test cases from problems — never expose to client via this route
  const sanitized = { ...contest };
  delete sanitized.problems; // problems fetched via separate protected route

  res.json(new ApiResponse(200, sanitized));
});

// POST /api/contests
export const createContest = asyncHandler(async (req, res) => {
  const {
    title, description, startTime, endTime,
    entryFee, prizePool, prizeDistribution,
    maxParticipants, tags,
  } = req.body;

  if (!title || !startTime || !endTime || entryFee == null || prizePool == null) {
    throw new ApiError(400, 'title, startTime, endTime, entryFee, prizePool are required');
  }

  if (new Date(startTime) >= new Date(endTime)) {
    throw new ApiError(400, 'endTime must be after startTime');
  }

  if (new Date(startTime) <= new Date()) {
    throw new ApiError(400, 'startTime must be in the future');
  }

  const slug = await generateSlug(title);

  const contest = await Contest.create({
    title, slug, description, organizerId: req.user._id,
    startTime, endTime, entryFee, prizePool,
    prizeDistribution: prizeDistribution || [],
    maxParticipants: maxParticipants || 500,
    tags: tags || [],
  });

  res.status(201).json(new ApiResponse(201, contest, 'Contest created'));
});

// PUT /api/contests/:id
export const updateContest = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, 'Contest not found');

  const isOwner = contest.organizerId.toString() === req.user._id.toString();
  const isAdmin = isAdminRole(req.user.role);
  if (!isOwner && !isAdmin) throw new ApiError(403, 'Not authorized');

  if (contest.status !== 'draft') {
    throw new ApiError(400, 'Only draft contests can be edited');
  }

  const forbidden = ['slug', 'organizerId', 'participants', 'registeredCount', 'status'];
  forbidden.forEach((f) => delete req.body[f]);

  Object.assign(contest, req.body);
  await contest.save();

  res.json(new ApiResponse(200, contest, 'Contest updated'));
});

// DELETE /api/contests/:id
export const deleteContest = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, 'Contest not found');

  const isOwner = contest.organizerId.toString() === req.user._id.toString();
  if (!isOwner && !isAdminRole(req.user.role)) throw new ApiError(403, 'Not authorized');
  if (contest.status !== 'draft') throw new ApiError(400, 'Only draft contests can be deleted');

  await contest.deleteOne();
  res.json(new ApiResponse(200, null, 'Contest deleted'));
});

// GET /api/contests/:id/problems  (registered users only, contest must be live/judging/closed)
export const getContestProblems = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id)
    .populate({
      path: 'problems',
      select: '-testCases', // never expose hidden test cases
    });

  if (!contest) throw new ApiError(404, 'Contest not found');

  const allowedStatuses = ['live', 'judging', 'closed'];
  if (!allowedStatuses.includes(contest.status)) {
    throw new ApiError(403, 'Problems are only accessible during or after the contest');
  }

  const registration = await Registration.findOne({
    userId: req.user._id,
    contestId: contest._id,
    status: 'confirmed',
  });

  if (!registration && !isAdminRole(req.user.role)) {
    throw new ApiError(403, 'You are not registered for this contest');
  }

  res.json(new ApiResponse(200, contest.problems));
});

// GET /api/contests/:id/arena
export const getContestArena = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id)
    .populate('organizerId', 'name email')
    .populate({
      path: 'problems',
      select: '-testCases',
    })
    .lean();

  if (!contest) throw new ApiError(404, 'Contest not found');

  const allowedStatuses = ['live', 'judging', 'closed'];
  if (!allowedStatuses.includes(contest.status)) {
    throw new ApiError(403, 'Arena is only accessible during or after the contest');
  }

  const registration = await Registration.findOne({
    userId: req.user._id,
    contestId: contest._id,
    status: 'confirmed',
  });

  if (!registration && !isAdminRole(req.user.role)) {
    throw new ApiError(403, 'You are not registered for this contest');
  }

  const { problems, participants, ...contestData } = contest;

  res.json(new ApiResponse(200, {
    contest: contestData,
    problems,
  }));
});

// GET /api/contests/:id/leaderboard
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const leaderboard = await getLeaderboardSnapshot(id);
  res.json(new ApiResponse(200, leaderboard));
});

// GET /api/contests/:id/my-submissions
export const getMySubmissions = asyncHandler(async (req, res) => {
  const Submission = (await import('../models/Submission.js')).default;
  const { page = 1, limit = 20 } = req.query;
  const pagination = parsePagination(page, limit, 20);

  const [submissions, total] = await Promise.all([
    Submission.find({
      contestId: req.params.id,
      userId: req.user._id,
    })
      .populate('problemId', 'title slug points')
      .sort({ submittedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Submission.countDocuments({
      contestId: req.params.id,
      userId: req.user._id,
    }),
  ]);

  res.json(new ApiResponse(200, {
    submissions,
    pagination: {
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
      limit: pagination.limit,
    },
  }));
});

// ── Internal helper ──
export const buildLeaderboard = async (contestId) => getLeaderboardSnapshot(contestId);
