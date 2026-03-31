import { Router } from 'express';
import {
  register, verifyOTP, login, refreshToken,
  logout, resendOTP, getMe
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  otpRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  verifyOtpRateLimiter,
  refreshTokenRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/verify-otp', verifyOtpRateLimiter, verifyOTP);
router.post('/login', loginRateLimiter, login);
router.post('/refresh-token', refreshTokenRateLimiter, refreshToken);
router.post('/logout', logout);
router.post('/resend-otp', otpRateLimiter, resendOTP);
router.get('/me', authenticate, getMe);

export default router;
