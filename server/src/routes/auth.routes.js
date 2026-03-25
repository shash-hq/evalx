import { Router } from 'express';
import {
  register, verifyOTP, login, refreshToken,
  logout, resendOTP, getMe
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { otpRateLimiter, loginRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginRateLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/resend-otp', otpRateLimiter, resendOTP);
router.get('/me', authenticate, getMe);

export default router;

