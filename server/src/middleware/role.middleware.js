import { ApiError } from '../utils/ApiError.js';

export const requireRole = (...roles) => (req, _, next) => {
  if (!req.user) throw new ApiError(401, 'Not authenticated');
  if (!roles.includes(req.user.role)) {
    throw new ApiError(403, `Access restricted to: ${roles.join(', ')}`);
  }
  next();
};




