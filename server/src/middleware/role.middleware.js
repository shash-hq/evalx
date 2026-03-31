import { ApiError } from '../utils/ApiError.js';
import { hasRoleAccess } from '../utils/roles.js';

export const requireRole = (...roles) => (req, _, next) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated');
  if (!hasRoleAccess(req.user.role, ...roles)) {
    throw new ApiError(403, `Access restricted to: ${roles.join(', ')}`);
  }
  next();
};



