import AuditLog from '../models/AuditLog.js';

const normalizeAuditValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return value.message;
  if (Array.isArray(value)) return value.map(normalizeAuditValue);

  if (value && typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();

    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, normalizeAuditValue(entryValue)])
    );
  }

  return value;
};

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
};

export const createAuditLog = async ({
  req,
  action,
  status = 'success',
  targetType = null,
  targetId = null,
  targetLabel = null,
  details = {},
}) => {
  if (!action) return null;

  try {
    return await AuditLog.create({
      actorId: req.user?._id || null,
      actorName: req.user?.name || null,
      actorEmail: req.user?.email || null,
      actorRole: req.user?.role || null,
      action,
      status,
      targetType,
      targetId: targetId ? String(targetId) : null,
      targetLabel,
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || null,
      details: normalizeAuditValue(details),
    });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
    return null;
  }
};
