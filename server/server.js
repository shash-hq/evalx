import 'dotenv/config'; // Must be the absolute first line
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initSocket } from './src/config/socket.js';
import './src/config/redis.js';
import { verifyMailTransport } from './src/services/mail.service.js';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocket(io);

// Make io accessible in controllers
app.set('io', io);

// Single block to connect DB, verify email, and start server
connectDB().then(() => {
  verifyMailTransport();
  httpServer.listen(PORT, () => {
    console.log(`EvalX server running on port ${PORT}`);
  });
});
