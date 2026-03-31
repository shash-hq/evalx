import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getSuperAdminHealth,
  getAuditLogs,
} from '../controllers/superadmin.controller.js';

const router = Router();

router.use(authenticate, requireRole('superadmin'));

router.get('/health', getSuperAdminHealth);
router.get('/audit-logs', getAuditLogs);

export default router;
