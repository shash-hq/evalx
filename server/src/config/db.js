import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info({ host: conn.connection.host }, 'MongoDB connected');
    return conn;
  } catch (err) {
    logger.error({ err: err.message }, 'MongoDB connection failed');
    throw err;
  }
};
