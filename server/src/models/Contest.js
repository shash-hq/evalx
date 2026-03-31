import mongoose from 'mongoose';

const prizeDistributionSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  percentage: { type: Number, required: true },
  payoutStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { _id: false });

const contestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'live', 'judging', 'closed'],
    default: 'draft',
  },
  entryFee: { type: Number, required: true, min: 0 },
  prizePool: { type: Number, required: true, min: 0 },
  prizeDistribution: [prizeDistributionSchema],
  maxParticipants: { type: Number, default: 500 },
  problems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  registeredCount: { type: Number, default: 0 },
  tags: [{ type: String, trim: true }],
  isApprovedByAdmin: { type: Boolean, default: false },
}, { timestamps: true });

contestSchema.index({ status: 1, startTime: 1, isApprovedByAdmin: 1 });
contestSchema.index({ organizerId: 1 });

export default mongoose.model('Contest', contestSchema);

