import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  type: { type: String, enum: ['entry_fee', 'prize_payout'], required: true },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },
  status: {
    type: String,
    enum: ['created', 'captured', 'failed', 'refunded'],
    default: 'created',
  },
  webhookVerified: { type: Boolean, default: false },
}, { timestamps: true });

transactionSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
transactionSchema.index({ userId: 1 });

export default mongoose.model('Transaction', transactionSchema);


