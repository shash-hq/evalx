import AuditLog from '../models/AuditLog.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPlatformHealth } from '../services/platformHealth.service.js';
import { parsePagination } from '../utils/pagination.js';

// GET /api/superadmin/health
export const getSuperAdminHealth = asyncHandler(async (req, res) => {
  const health = await getPlatformHealth();
  res.json(new ApiResponse(200, health));
});

// GET /api/superadmin/audit-logs
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, action, status, search } = req.query;
  const pagination = parsePagination(page, limit, 25);

  const query = {};

  if (action) query.action = String(action);
  if (status) query.status = String(status);

  if (search) {
    const regex = { $regex: String(search), $options: 'i' };
    query.$or = [
      { actorName: regex },
      { actorEmail: regex },
      { action: regex },
      { targetLabel: regex },
      { targetId: regex },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  res.json(new ApiResponse(200, {
    logs,
    pagination: {
      total,
      page: pagination.page,
      pages: Math.ceil(total / pagination.limit),
      limit: pagination.limit,
    },
  }));
});
