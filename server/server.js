import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { initSocket } from './src/config/socket.js';
import { attachRealtimeBridge } from './src/services/realtime.service.js';
import { ensureWebDependenciesReady } from './src/services/startup.service.js';
import logger from './src/utils/logger.js';

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

const startServer = async () => {
  try {
    const readiness = await ensureWebDependenciesReady();
    await attachRealtimeBridge(io);

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info({
        port: PORT,
        readiness: [...readiness, 'realtime_bridge'],
      }, 'EvalX server running');
    });
  } catch (error) {
    logger.fatal({ err: error?.message || error }, 'Failed startup readiness checks');
    process.exit(1);
  }
};

startServer();
