import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'cancelled'],
    default: 'pending_payment',
  },
  registeredAt: { type: Date, default: Date.now },
});

registrationSchema.index({ userId: 1, contestId: 1 }, { unique: true });

export default mongoose.model('Registration', registrationSchema);


