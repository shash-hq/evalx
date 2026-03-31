import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema({
  testCaseIndex: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  time: { type: Number, default: 0 },
  memory: { type: Number, default: 0 },
  stderr: { type: String, default: '' },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  code: { type: String, required: true },
  language: { type: String, enum: ['cpp', 'java', 'python', 'javascript'], required: true },
  languageId: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      'queued', 'processing', 'accepted', 'wrong_answer',
      'time_limit_exceeded', 'memory_limit_exceeded',
      'runtime_error', 'compilation_error',
    ],
    default: 'queued',
  },
  testResults: [testResultSchema],
  score: { type: Number, default: 0 },
  executionTime: { type: Number, default: 0 },
  memoryUsed: { type: Number, default: 0 },
  isFirstAccepted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
}, { timestamps: false });

submissionSchema.index({ userId: 1, contestId: 1 });
submissionSchema.index({ contestId: 1, status: 1, submittedAt: -1 });
submissionSchema.index({ problemId: 1, userId: 1, contestId: 1 });

export default mongoose.model('Submission', submissionSchema);


