import { Router } from 'express';
import {
  getAllContests, approveContest, rejectContest,
  triggerClose, processPayouts,
  getAllUsers, updateUserRole, getDashboardStats,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/stats', getDashboardStats);
router.get('/contests', getAllContests);
router.put('/contests/:id/approve', approveContest);
router.put('/contests/:id/reject', rejectContest);
router.post('/contests/:id/trigger-close', triggerClose);
router.post('/contests/:id/payouts', processPayouts);
router.get('/users', getAllUsers);
router.put('/users/:id/role', requireRole('superadmin'), updateUserRole);

export default router;
