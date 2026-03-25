import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['contestant', 'organizer', 'admin'], default: 'contestant' },
  isEmailVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  rating: { type: Number, default: 1200 },
  contestsEntered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contest' }],
  refreshToken: { type: String, default: null },
}, { timestamps: true });

userSchema.pre('save', async function () {
  // If the passwordHash field hasn't been modified, exit the hook
  if (!this.isModified('passwordHash')) {
    return; 
  }

  // Generate salt and hash the password (no next() callbacks needed)
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.otpAttempts;
  delete obj.refreshToken;
  return obj;
};

export default mongoose.model('User', userSchema);

