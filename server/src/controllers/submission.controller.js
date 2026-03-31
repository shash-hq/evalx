import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import Contest from '../models/Contest.js';
import Registration from '../models/Registration.js';
import submissionQueue from '../queues/submission.queue.js';
import { isValidLanguage, PISTON_LANGUAGES } from '../utils/pistonLanguages.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isAdminRole } from '../utils/roles.js';

// POST /api/submissions
export const createSubmission = asyncHandler(async (req, res) => {
  console.log('--- DEBUG 1: BODY RECEIVED ---', req.body);
  const { problemId, contestId, code, language } = req.body;

  if (!problemId || !contestId || !code || !language) {
    throw new ApiError(400, 'problemId, contestId, code, language are required');
  }

  if (!isValidLanguage(language)) {
    throw new ApiError(400, `Unsupported language. Use: ${Object.keys(PISTON_LANGUAGES).join(', ')}`);
  }

  if (code.length > 50000) throw new ApiError(400, 'Code exceeds 50KB limit');

  console.log('--- DEBUG 2: STARTING DB VALIDATIONS ---');
  
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

  // Rate limit check
  const recentSubmission = await Submission.findOne({
    userId: req.user._id,
    problemId,
    contestId,
    submittedAt: { $gte: new Date(Date.now() - 30000) },
  });
  if (recentSubmission) {
    throw new ApiError(429, 'Wait 30 seconds between submissions');
  }

  console.log('--- DEBUG 3: CREATING SUBMISSION DOC IN ATLAS ---');
  
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

  console.log('--- DEBUG 4: DOC CREATED. ATTEMPTING BULL QUEUE ADD ---');
  console.log('Wait... if the terminal stops here, your Redis connection is stalled.');

  // Enqueue for processing
  // CRITICAL: This is where most local Redis setups hang if the service isn't running
  await submissionQueue.add(
    { submissionId: submission._id.toString() },
    { jobId: submission._id.toString() } 
  );

  console.log('--- DEBUG 5: QUEUE SUCCESS! SENDING RESPONSE ---');

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

  const skip = (Number(page) - 1) * Number(limit);

  const [submissions, total] = await Promise.all([
    Submission.find({ contestId, status: 'accepted' })
      .populate('userId', 'name')
      .populate('problemId', 'title slug')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Submission.countDocuments({ contestId, status: 'accepted' }),
  ]);

  res.json(new ApiResponse(200, {
    submissions,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  }));
});
