import { Router } from 'express';
import { createOrder, verifyPayment, handleWebhook, getPaymentHistory } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Webhook must stay unauthenticated — Razorpay hits this directly
// express.raw() is applied in app.js for this route
router.post('/webhook', handleWebhook);

router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);

export default router;

