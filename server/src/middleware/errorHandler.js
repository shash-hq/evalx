import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  // Manually attach CORS headers on error responses
  // so the browser doesn't mask the real error as a CORS failure
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    'https://evalx.in',
    'https://www.evalx.in',
    'https://evalx-nine.vercel.app',
    'http://localhost:5173',
  ].filter(Boolean));

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
};
