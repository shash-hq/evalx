import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorName: { type: String, default: null, trim: true },
  actorEmail: { type: String, default: null, lowercase: true, trim: true },
  actorRole: { type: String, default: null, trim: true },
  action: { type: String, required: true, trim: true, index: true },
  status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
  targetType: { type: String, default: null, trim: true },
  targetId: { type: String, default: null, trim: true },
  targetLabel: { type: String, default: null, trim: true },
  ipAddress: { type: String, default: null, trim: true },
  userAgent: { type: String, default: null, trim: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
