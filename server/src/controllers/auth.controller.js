import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, isOTPExpired } from '../services/otp.service.js';
import { sendOTPEmail } from '../services/mail.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { _id: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { _id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'All fields are required');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const existing = await User.findOne({ email });
  if (existing && existing.isEmailVerified) throw new ApiError(409, 'Email already registered');

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  if (existing && !existing.isEmailVerified) {
    existing.name = name;
    existing.passwordHash = password; // triggers pre-save hash
    existing.otp = otp;
    existing.otpExpiry = otpExpiry;
    existing.otpAttempts = 0;
    await existing.save();
  } else {
    await User.create({ name, email, passwordHash: password, otp, otpExpiry });
  }

  await sendOTPEmail(email, otp);

  res.status(201).json(new ApiResponse(201, { email }, 'OTP sent to your email'));
});

// POST /api/auth/verify-otp
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
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

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.status(200).json(new ApiResponse(200, {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  }, 'Email verified. Logged in.'));
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isEmailVerified) throw new ApiError(403, 'Please verify your email first');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  res.status(200).json(new ApiResponse(200, {
    user: user.toSafeObject(),
    accessToken,
    refreshToken,
  }, 'Login successful'));
});

// POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) throw new ApiError(400, 'Refresh token required');

  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== token) throw new ApiError(401, 'Invalid refresh token');

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
  user.refreshToken = newRefreshToken;
  await user.save();

  res.status(200).json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }));
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (token) {
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
  }
  res.status(200).json(new ApiResponse(200, null, 'Logged out'));
});

// POST /api/auth/resend-otp
export const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email required');

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isEmailVerified) throw new ApiError(400, 'Email already verified');

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  user.otpAttempts = 0;
  await user.save();

  await sendOTPEmail(email, otp);

  res.status(200).json(new ApiResponse(200, null, 'New OTP sent'));
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user.toSafeObject()));
});



