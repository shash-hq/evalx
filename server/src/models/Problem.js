import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
}, { _id: false });

const sampleCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: '' },
}, { _id: false });

const problemSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true },
  statement: { type: String, required: true },
  inputFormat: { type: String, default: '' },
  outputFormat: { type: String, default: '' },
  constraints: { type: String, default: '' },
  sampleCases: [sampleCaseSchema],
  testCases: [testCaseSchema],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  points: { type: Number, required: true },
  timeLimit: { type: Number, default: 2000 },
  memoryLimit: { type: Number, default: 256 },
  order: { type: Number, required: true },
}, { timestamps: true });

problemSchema.index({ contestId: 1, order: 1 });

export default mongoose.model('Problem', problemSchema);


