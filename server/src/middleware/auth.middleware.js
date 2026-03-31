import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) throw new ApiError(401, 'Access token required');

  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  const user = await User.findById(decoded._id).select('-passwordHash -otp -otpExpiry -refreshTokenHash -refreshToken');

  if (!user) throw new ApiError(401, 'Invalid token');
  if (!user.isEmailVerified) throw new ApiError(403, 'Email not verified');

  req.user = user;
  next();
});


