import mongoose from 'mongoose';

const leaderboardEntrySchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalScore: { type: Number, default: 0 },
  solvedCount: { type: Number, default: 0 },
  lastSolvedAt: { type: Date, default: null },
}, {
  timestamps: true,
  collection: 'leaderboard_entries',
});

leaderboardEntrySchema.index({ contestId: 1, userId: 1 }, { unique: true });
leaderboardEntrySchema.index({ contestId: 1, totalScore: -1, lastSolvedAt: 1 });

export default mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
