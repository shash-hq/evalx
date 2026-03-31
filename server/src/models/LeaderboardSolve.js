import mongoose from 'mongoose';

const leaderboardSolveSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  score: { type: Number, default: 0 },
  firstAcceptedAt: { type: Date, required: true },
}, {
  timestamps: true,
  collection: 'leaderboard_solves',
});

leaderboardSolveSchema.index({ contestId: 1, userId: 1, problemId: 1 }, { unique: true });
leaderboardSolveSchema.index({ contestId: 1, userId: 1 });

export default mongoose.model('LeaderboardSolve', leaderboardSolveSchema);
