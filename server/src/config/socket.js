let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Contest room — leaderboard updates
    socket.on('join:contest', (contestId) => {
      socket.join(`contest:${contestId}`);
    });

    socket.on('leave:contest', (contestId) => {
      socket.leave(`contest:${contestId}`);
    });

    // User room — personal submission results
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

