import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const REFRESH_COOKIE_NAME = 'evalx_refresh_token';

const parseDurationToMs = (value, fallbackMs) => {
  if (!value || typeof value !== 'string') return fallbackMs;

  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitToMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * unitToMs[unit];
};

export const getRefreshCookieName = () => REFRESH_COOKIE_NAME;

export const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { _id: userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { _id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
};

const getBaseRefreshCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/api/auth',
  };
};

export const setRefreshTokenCookie = (res, refreshToken) => {
  const decoded = jwt.decode(refreshToken);
  const fallbackMaxAge = parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRY, 7 * 24 * 60 * 60 * 1000);
  const expires =
    decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + fallbackMaxAge);

  res.cookie(getRefreshCookieName(), refreshToken, {
    ...getBaseRefreshCookieOptions(),
    expires,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(getRefreshCookieName(), getBaseRefreshCookieOptions());
};

export const getRefreshTokenFromRequest = (req) =>
  req.cookies?.[getRefreshCookieName()] || null;
