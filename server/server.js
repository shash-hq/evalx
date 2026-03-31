import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/config/socket.js';
import { verifyMailService } from './src/services/mail.service.js';
import logger from './src/utils/logger.js';
import './src/workers/submission.worker.js';
import './src/workers/contest.worker.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocket(io);
app.set('io', io);

connectDB().then(() => {
  verifyMailService();
  httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`EvalX server running on port ${PORT}`);
});
}).catch((err) => {
  logger.fatal({ err }, 'Failed to connect to database');
  process.exit(1);
});

