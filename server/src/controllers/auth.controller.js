import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, isOTPExpired } from '../services/otp.service.js';
import { sendOTPEmail } from '../services/mail.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateTokens,
  hashRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
} from '../utils/authTokens.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const buildSessionPayload = async (res, user, message = 'Session created') => {
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshTokenHash = hashRefreshToken(refreshToken);
  await user.save();
  setRefreshTokenCookie(res, refreshToken);

  return new ApiResponse(200, {
    user: user.toSafeObject(),
    accessToken,
  }, message);
};

const resolveRefreshTokenUser = async (token) => {
  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decoded._id);

  if (!user || user.refreshTokenHash !== hashRefreshToken(token)) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  return user;
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!name || !email || !password) throw new ApiError(400, 'All fields are required');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const existing = await User.findOne({ email });
  if (existing && existing.isEmailVerified) throw new ApiError(409, 'Email already registered');

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  if (existing && !existing.isEmailVerified) {
    existing.name = name;
    existing.passwordHash = password;
    existing.otp = otp;
    existing.otpExpiry = otpExpiry;
    existing.otpAttempts = 0;
    await existing.save();
  } else {
    await User.create({ name, email, passwordHash: password, otp, otpExpiry });
  }

  try {
    await sendOTPEmail(email, otp);
  } catch (emailErr) {
    console.error('OTP email failed:', emailErr.message);
    throw new ApiError(502, 'Unable to send OTP email right now. Please try again.');
  }

  res.status(201).json(new ApiResponse(201, { email }, 'OTP sent to your email'));
});

// POST /api/auth/verify-otp
export const verifyOTP = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isEmailVerified) throw new ApiError(400, 'Email already verified');

  if (user.otpAttempts >= 5) throw new ApiError(429, 'Too many failed attempts. Re-register.');
  if (isOTPExpired(user.otpExpiry)) throw new ApiError(400, 'OTP expired. Request a new one.');
  if (user.otp !== otp) {
    user.otpAttempts += 1;
    await user.save();
    throw new ApiError(400, `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`);
  }

  user.isEmailVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  user.otpAttempts = 0;

  const response = await buildSessionPayload(res, user, 'Email verified. Logged in.');
  res.status(200).json(response);
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isEmailVerified) throw new ApiError(403, 'Please verify your email first');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  const response = await buildSessionPayload(res, user, 'Login successful');
  res.status(200).json(response);
});

// POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = getRefreshTokenFromRequest(req);
  if (!token) throw new ApiError(401, 'Refresh token required');

  try {
    const user = await resolveRefreshTokenUser(token);
    const response = await buildSessionPayload(res, user, 'Session refreshed');
    res.status(200).json(response);
  } catch (error) {
    clearRefreshTokenCookie(res);
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Invalid refresh token');
  }
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const token = getRefreshTokenFromRequest(req);

  if (token) {
    try {
      const user = await resolveRefreshTokenUser(token);
      user.refreshTokenHash = null;
      await user.save();
    } catch (_) {
      // Ignore invalid/expired refresh tokens on logout; clearing the cookie is enough.
    }
  }

  clearRefreshTokenCookie(res);
  res.status(200).json(new ApiResponse(200, null, 'Logged out'));
});

// POST /api/auth/resend-otp
export const resendOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) throw new ApiError(400, 'Email required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isEmailVerified) throw new ApiError(400, 'Email already verified');

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  user.otpAttempts = 0;
  await user.save();

  try {
    await sendOTPEmail(email, otp);
  } catch (emailErr) {
    console.error('OTP email failed:', emailErr.message);
    throw new ApiError(502, 'Unable to send OTP email right now. Please try again.');
  }

  res.status(200).json(new ApiResponse(200, null, 'New OTP sent'));
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user.toSafeObject()));
});
