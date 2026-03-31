import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import Contest from '../models/Contest.js';
import Registration from '../models/Registration.js';
import submissionQueue from '../queues/submission.queue.js';
import redis from '../config/redis.js';
import { isValidLanguage, PISTON_LANGUAGES } from '../utils/pistonLanguages.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/pagination.js';
import { isAdminRole } from '../utils/roles.js';

const SUBMISSION_RATE_LIMIT_WINDOW_SECONDS = 60;
const SUBMISSION_RATE_LIMIT_MAX = 3;

// POST /api/submissions
export const createSubmission = asyncHandler(async (req, res) => {
  const { problemId, contestId, code, language } = req.body;

  if (!problemId || !contestId || !code || !language) {
    throw new ApiError(400, 'problemId, contestId, code, language are required');
  }

  if (!isValidLanguage(language)) {
    throw new ApiError(400, `Unsupported language. Use: ${Object.keys(PISTON_LANGUAGES).join(', ')}`);
  }

  if (code.length > 50000) throw new ApiError(400, 'Code exceeds 50KB limit');

  // Validate contest is live
  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, 'Contest not found');
  if (contest.status !== 'live') throw new ApiError(400, 'Contest is not live');

  // Validate problem belongs to contest
  const problem = await Problem.findById(problemId);
  if (!problem) throw new ApiError(404, 'Problem not found');
  if (problem.contestId.toString() !== contestId) {
    throw new ApiError(400, 'Problem does not belong to this contest');
  }

  // Validate user is registered
  const registration = await Registration.findOne({
    userId: req.user._id,
    contestId,
    status: 'confirmed',
  });
  if (!registration && !isAdminRole(req.user.role)) {
    throw new ApiError(403, 'You are not registered for this contest');
  }

  // Queue-level rate limiting: max 3 submissions/minute/user/contest.
  const rateLimitKey = `submission-rate:${contestId}:${req.user._id}`;
  try {
    const rateLimitCount = await redis.incr(rateLimitKey);

    if (rateLimitCount === 1) {
      await redis.expire(rateLimitKey, SUBMISSION_RATE_LIMIT_WINDOW_SECONDS);
    }

    if (rateLimitCount > SUBMISSION_RATE_LIMIT_MAX) {
      const retryAfterSeconds = Math.max(await redis.ttl(rateLimitKey), 1);
      throw new ApiError(
        429,
        `Submission limit reached. Max ${SUBMISSION_RATE_LIMIT_MAX} submissions per minute per contest. Try again in ${retryAfterSeconds}s.`
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'Submission rate limiter is temporarily unavailable. Please try again.');
  }

  const submission = await Submission.create({
    userId: req.user._id,
    problemId,
    contestId,
    code,
    language,
    languageId: 0, 
    status: 'queued',
    submittedAt: new Date(),
  });

  // Enqueue for processing
  try {
    await submissionQueue.add(
      {
        submissionId: submission._id.toString(),
        userId: req.user._id.toString(),
        contestId,
      },
      { jobId: submission._id.toString() }
    );
  } catch (error) {
    try {
      await redis.decr(rateLimitKey);
    } catch (_) {}
    await submission.deleteOne();
    throw new ApiError(503, 'Submission queue is temporarily unavailable. Please try again.');
  }

  res.status(201).json(new ApiResponse(201, {
    submissionId: submission._id,
    status: 'queued',
  }, 'Submission queued'));
});

// GET /api/submissions/:id
export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('problemId', 'title slug points')
    .lean();

  if (!submission) throw new ApiError(404, 'Submission not found');

  if (
    submission.userId.toString() !== req.user._id.toString() &&
    !isAdminRole(req.user.role)
  ) {
    throw new ApiError(403, 'Not authorized');
  }

  res.json(new ApiResponse(200, submission));
});

// GET /api/submissions/contest/:contestId
export const getContestSubmissions = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const pagination = parsePagination(page, limit, 20);

  const [submissions, total] = await Promise.all([
    Submission.find({ contestId, status: 'accepted' })
      .populate('userId', 'name')
      .populate('problemId', 'title slug')
      .sort({ submittedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Submission.countDocuments({ contestId, status: 'accepted' }),
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
