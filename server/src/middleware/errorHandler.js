import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin === process.env.CLIENT_URL) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (err instanceof ApiError) {
    logger.warn({
      statusCode: err.statusCode,
      message: err.message,
      url: req.url,
      method: req.method,
    }, 'API error');

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    logger.warn({ errors, url: req.url }, 'Mongoose validation error');
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    logger.warn({ field, url: req.url }, 'Duplicate key error');
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  logger.error({ err, url: req.url, method: req.method }, 'Unhandled server error');
  return res.status(500).json({ success: false, message: 'Internal server error' });
};
