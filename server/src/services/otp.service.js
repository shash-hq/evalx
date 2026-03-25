import crypto from 'crypto';

export const generateOTP = () => {
  // Cryptographically secure 6-digit OTP
  return crypto.randomInt(100000, 999999).toString();
};

export const isOTPExpired = (otpExpiry) => {
  return Date.now() > new Date(otpExpiry).getTime();
};



