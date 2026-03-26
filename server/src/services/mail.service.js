import nodemailer from 'nodemailer';

// --- THE UPDATED TRANSPORTER ---
const transporter = nodemailer.createTransport({
  service: 'gmail', // ← This tells Nodemailer to handle the Google network routing internally
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // dev only
  },
});
// -------------------------------

export const sendOTPEmail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"EvalX" <${process.env.MAIL_FROM}>`,
      to,
      subject: 'Your EvalX Verification Code',
      html: `
        <div style="font-family: monospace; max-width: 480px; margin: auto; padding: 32px; background: #0f0f0f; color: #ffffff; border-radius: 8px; border: 1px solid #2a2a2a;">
          <h2 style="color: #a855f7; margin: 0 0 8px;">EvalX</h2>
          <p style="color: #888; margin: 0 0 24px; font-size: 14px;">Competitive Coding Platform</p>
          <p style="font-size: 14px; color: #ccc;">Your verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #a855f7; padding: 16px 0;">${otp}</div>
          <p style="font-size: 12px; color: #555; margin-top: 24px;">Expires in 10 minutes. Do not share this code.</p>
        </div>
      `,
    });
    console.log(`OTP sent successfully to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw error; 
  }
};

export const verifyMailTransport = async () => {
  try {
    await transporter.verify();
    console.log('SMTP transport ready');
  } catch (err) {
    console.error('SMTP connection failed:', err.message);
  }
};
