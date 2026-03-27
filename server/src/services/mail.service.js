import nodemailer from 'nodemailer';

// Transporter setup using your Gmail SMTP credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTPEmail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"EvalX" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
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
    // Nodemailer actually pings the SMTP server to verify credentials
    await transporter.verify();
    console.log('Nodemailer email service ready (Gmail SMTP)');
  } catch (error) {
    console.error('SMTP Connection Error. Check your App Password:', error.message);
  }
};
