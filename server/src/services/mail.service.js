import axios from 'axios';

const RESEND_API_BASE_URL = (process.env.RESEND_API_BASE_URL || 'https://api.resend.com').replace(/\/+$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || '';
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || '';
const MAIL_REQUEST_TIMEOUT_MS = parsePositiveNumber(process.env.MAIL_REQUEST_TIMEOUT_MS, 10000);

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildResendHeaders() {
  return {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function assertMailConfig() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  if (!MAIL_FROM) {
    throw new Error('MAIL_FROM is not configured');
  }
}

function formatMailError(error) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.name ||
    error?.message ||
    'Unknown mail error';

  return typeof message === 'string' ? message : JSON.stringify(message);
}

function buildOtpEmailHtml(otp) {
  return `
    <div style="font-family: monospace; max-width: 480px; margin: auto; padding: 32px; background: #0f0f0f; color: #ffffff; border-radius: 8px; border: 1px solid #2a2a2a;">
      <h2 style="color: #a855f7; margin: 0 0 8px;">EvalX</h2>
      <p style="color: #888; margin: 0 0 24px; font-size: 14px;">Competitive Coding Platform</p>
      <p style="font-size: 14px; color: #ccc;">Your verification code is:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #a855f7; padding: 16px 0;">${otp}</div>
      <p style="font-size: 12px; color: #555; margin-top: 24px;">Expires in 10 minutes. Do not share this code.</p>
    </div>
  `;
}

function buildOtpEmailText(otp) {
  return `Your EvalX verification code is: ${otp}. It expires in 10 minutes.`;
}

export const sendOTPEmail = async (to, otp) => {
  assertMailConfig();

  try {
    const payload = {
      from: MAIL_FROM,
      to: [to],
      subject: 'Your EvalX Verification Code',
      html: buildOtpEmailHtml(otp),
      text: buildOtpEmailText(otp),
      tags: [
        { name: 'app', value: 'evalx' },
        { name: 'type', value: 'otp' },
      ],
    };

    if (MAIL_REPLY_TO) {
      payload.reply_to = MAIL_REPLY_TO;
    }

    const { data } = await axios.post(`${RESEND_API_BASE_URL}/emails`, payload, {
      headers: buildResendHeaders(),
      timeout: MAIL_REQUEST_TIMEOUT_MS,
    });

    console.log(`OTP sent successfully to ${to} via Resend (${data?.id || 'no-id'})`);
  } catch (error) {
    const message = formatMailError(error);
    console.error('Email sending failed:', message);
    throw new Error(message);
  }
};

export const verifyMailService = async () => {
  if (!RESEND_API_KEY || !MAIL_FROM) {
    console.warn('Email service not configured. Set RESEND_API_KEY and MAIL_FROM to enable OTP emails.');
    return;
  }

  console.log(`Resend email service configured (${RESEND_API_BASE_URL})`);
};
