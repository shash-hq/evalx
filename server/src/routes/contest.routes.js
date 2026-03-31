import { Router } from 'express';
import {
  getContests, getContestBySlug, createContest,
  updateContest, deleteContest, getContestProblems,
  getLeaderboard, getMySubmissions, getContestArena,
} from '../controllers/contest.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.get('/', getContests);
router.get('/:slug', getContestBySlug);
router.post('/', authenticate, requireRole('organizer', 'admin'), createContest);
router.put('/:id', authenticate, requireRole('organizer', 'admin'), updateContest);
router.delete('/:id', authenticate, requireRole('organizer', 'admin'), deleteContest);
router.get('/:id/arena', authenticate, getContestArena);
router.get('/:id/problems', authenticate, getContestProblems);
router.get('/:id/leaderboard', getLeaderboard);
router.get('/:id/my-submissions', authenticate, getMySubmissions);

export default router;
