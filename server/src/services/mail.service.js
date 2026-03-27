import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (to, otp) => {
  try {
    await resend.emails.send({
      from: 'EvalX <onboarding@resend.dev>', // use this until you add a custom domain
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
    console.log(`OTP sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw error;
  }
};

export const verifyMailTransport = async () => {
  // Resend doesn't need a persistent connection verify
  // Just confirm the key exists
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
  } else {
    console.log('Resend email service ready');
  }
};
