
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/config/socket.js';
import { verifyMailService } from './src/services/mail.service.js';
import './src/workers/submission.worker.js'; // ← registers Bull processor
import './src/workers/contest.worker.js'; // ← add this

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
  httpServer.listen(PORT, () => {
    console.log(`EvalX server running on port ${PORT}`);
  });
});
