import { Router } from 'express';
import { createProblem, getProblem, updateProblem, deleteProblem } from '../controllers/problem.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.post('/', authenticate, requireRole('organizer', 'admin'), createProblem);
router.get('/:id', authenticate, getProblem);
router.put('/:id', authenticate, requireRole('organizer', 'admin'), updateProblem);
router.delete('/:id', authenticate, requireRole('organizer', 'admin'), deleteProblem);

export default router;
