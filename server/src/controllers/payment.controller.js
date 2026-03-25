import mongoose from 'mongoose';
import Contest from '../models/Contest.js';
import Transaction from '../models/Transaction.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature } from '../services/payment.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ── Helper: confirm registration atomically ──
const confirmRegistration = async (session, { userId, contestId, transactionId }) => {
  await Transaction.findByIdAndUpdate(
    transactionId,
    { status: 'captured', webhookVerified: false },
    { session }
  );

  const registration = await Registration.findOneAndUpdate(
    { userId, contestId },
    { status: 'confirmed', transactionId },
    { session, new: true, upsert: true }
  );

  await Contest.findByIdAndUpdate(
    contestId,
    {
      $addToSet: { participants: userId },
      $inc: { registeredCount: 1 },
    },
    { session }
  );

  await User.findByIdAndUpdate(
    userId,
    { $addToSet: { contestsEntered: contestId } },
    { session }
  );

  return registration;
};

// POST /api/payments/create-order
export const createOrder = asyncHandler(async (req, res) => {
  const { contestId } = req.body;
  if (!contestId) throw new ApiError(400, 'contestId is required');

  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, 'Contest not found');
  if (!contest.isApprovedByAdmin) throw new ApiError(403, 'Contest not approved yet');
  if (!['upcoming', 'live'].includes(contest.status)) {
    throw new ApiError(400, 'Registration is closed for this contest');
  }
  if (contest.registeredCount >= contest.maxParticipants) {
    throw new ApiError(400, 'Contest is full');
  }

  // Check existing registration
  const existingReg = await Registration.findOne({
    userId: req.user._id,
    contestId,
    status: 'confirmed',
  });
  if (existingReg) throw new ApiError(409, 'Already registered for this contest');

  // Free contest — skip payment
  if (contest.entryFee === 0) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const registration = await Registration.findOneAndUpdate(
        { userId: req.user._id, contestId },
        { status: 'confirmed', transactionId: null },
        { session, new: true, upsert: true }
      );
      await Contest.findByIdAndUpdate(
        contestId,
        { $addToSet: { participants: req.user._id }, $inc: { registeredCount: 1 } },
        { session }
      );
      await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { contestsEntered: contestId } },
        { session }
      );
      await session.commitTransaction();
      return res.status(201).json(new ApiResponse(201, { free: true, registration }, 'Registered successfully'));
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // Paid contest
  const receipt = `evalx_${req.user._id.toString().slice(-6)}_${Date.now()}`;
  const order = await createRazorpayOrder({
    amount: contest.entryFee,
    receipt,
  });

  const transaction = await Transaction.create({
    userId: req.user._id,
    contestId,
    amount: contest.entryFee,
    type: 'entry_fee',
    razorpayOrderId: order.id,
    status: 'created',
  });

  res.status(201).json(new ApiResponse(201, {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID,
    transactionId: transaction._id,
    contestTitle: contest.title,
  }));
});

// POST /api/payments/verify
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, contestId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !contestId) {
    throw new ApiError(400, 'All payment fields are required');
  }

  const isValid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature: razorpaySignature });
  if (!isValid) throw new ApiError(400, 'Invalid payment signature');

  const transaction = await Transaction.findOne({ razorpayOrderId });
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  if (transaction.status === 'captured') {
    return res.json(new ApiResponse(200, null, 'Payment already confirmed'));
  }
  if (transaction.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Transaction does not belong to this user');
  }

  transaction.razorpayPaymentId = razorpayPaymentId;
  transaction.razorpaySignature = razorpaySignature;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await transaction.save({ session });
    await confirmRegistration(session, {
      userId: req.user._id,
      contestId,
      transactionId: transaction._id,
    });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  res.json(new ApiResponse(200, null, 'Payment verified. Registration confirmed.'));
});

// POST /api/payments/webhook  ← raw body, no auth
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) throw new ApiError(400, 'Missing webhook signature');

  const rawBody = req.body; // Buffer because of express.raw()
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) throw new ApiError(400, 'Invalid webhook signature');

  const event = JSON.parse(rawBody.toString());

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const razorpayOrderId = payment.order_id;

    const transaction = await Transaction.findOne({ razorpayOrderId });

    // Idempotency — skip if already processed
    if (!transaction || transaction.webhookVerified) {
      return res.status(200).json({ received: true });
    }

    if (transaction.status !== 'captured') {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        transaction.razorpayPaymentId = payment.id;
        transaction.webhookVerified = true;
        await transaction.save({ session });

        await confirmRegistration(session, {
          userId: transaction.userId,
          contestId: transaction.contestId,
          transactionId: transaction._id,
        });

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        // Don't throw — Razorpay retries on non-2xx. Log and return 200.
        console.error('Webhook processing error:', err.message);
      } finally {
        session.endSession();
      }
    } else {
      // Payment was already captured via /verify, just mark webhook confirmed
      await Transaction.findByIdAndUpdate(transaction._id, { webhookVerified: true });
    }
  }

  if (event.event === 'payment.failed') {
    const payment = event.payload.payment.entity;
    await Transaction.findOneAndUpdate(
      { razorpayOrderId: payment.order_id },
      { status: 'failed' }
    );
  }

  res.status(200).json({ received: true });
});

// GET /api/payments/history
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user._id })
    .populate('contestId', 'title slug startTime')
    .sort({ createdAt: -1 })
    .lean();

  res.json(new ApiResponse(200, transactions));
});

