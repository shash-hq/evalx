import slugify from 'slugify';
import Problem from '../models/Problem.js';
import Contest from '../models/Contest.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// POST /api/problems
export const createProblem = asyncHandler(async (req, res) => {
  const {
    contestId, title, statement, inputFormat, outputFormat,
    constraints, sampleCases, testCases, difficulty, points,
    timeLimit, memoryLimit, order,
  } = req.body;

  if (!contestId || !title || !statement || !testCases?.length || !difficulty || !points || order == null) {
    throw new ApiError(400, 'Missing required fields');
  }

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, 'Contest not found');

  const isOwner = contest.organizerId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Not authorized');
  if (contest.status !== 'draft') throw new ApiError(400, 'Cannot add problems after contest is published');

  let slug = slugify(title, { lower: true, strict: true });
  const existing = await Problem.findOne({ contestId, slug });
  if (existing) slug = `${slug}-${Date.now()}`;

  const problem = await Problem.create({
    contestId, title, slug, statement,
    inputFormat, outputFormat, constraints,
    sampleCases: sampleCases || [],
    testCases,
    difficulty, points,
    timeLimit: timeLimit || 2000,
    memoryLimit: memoryLimit || 256,
    order,
  });

  // Push problem ref into contest
  await Contest.findByIdAndUpdate(contestId, { $push: { problems: problem._id } });

  res.status(201).json(new ApiResponse(201, problem, 'Problem created'));
});

// GET /api/problems/:id
export const getProblem = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id).select('-testCases').lean();
  if (!problem) throw new ApiError(404, 'Problem not found');
  res.json(new ApiResponse(200, problem));
});

// PUT /api/problems/:id
export const updateProblem = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  if (!problem) throw new ApiError(404, 'Problem not found');

  const contest = await Contest.findById(problem.contestId);
  const isOwner = contest.organizerId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Not authorized');
  if (contest.status !== 'draft') throw new ApiError(400, 'Cannot edit after contest published');

  const forbidden = ['contestId', 'slug'];
  forbidden.forEach((f) => delete req.body[f]);

  Object.assign(problem, req.body);
  await problem.save();

  res.json(new ApiResponse(200, problem, 'Problem updated'));
});

// DELETE /api/problems/:id
export const deleteProblem = asyncHandler(async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  if (!problem) throw new ApiError(404, 'Problem not found');

  const contest = await Contest.findById(problem.contestId);
  const isOwner = contest.organizerId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Not authorized');
  if (contest.status !== 'draft') throw new ApiError(400, 'Cannot delete after contest published');

  await problem.deleteOne();
  await Contest.findByIdAndUpdate(problem.contestId, { $pull: { problems: problem._id } });

  res.json(new ApiResponse(200, null, 'Problem deleted'));
});
