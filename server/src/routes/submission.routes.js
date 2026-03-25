import { Router } from 'express';
import { createSubmission, getSubmission, getContestSubmissions } from '../controllers/submission.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, createSubmission);
router.get('/contest/:contestId', getContestSubmissions);
router.get('/:id', authenticate, getSubmission);

export default router;



