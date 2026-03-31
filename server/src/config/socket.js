import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Contest from '../models/Contest.js';
import Registration from '../models/Registration.js';
import { isAdminRole } from '../utils/roles.js';

export const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Socket authentication required'));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select(
        '-passwordHash -otp -otpExpiry -refreshTokenHash -refreshToken'
      );

      if (!user || !user.isEmailVerified) {
        return next(new Error('Invalid socket session'));
      }

      socket.data.user = user;
      return next();
    } catch (error) {
      return next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userRoom = `user:${user._id}`;

    socket.join(userRoom);
    console.log(`Socket connected: ${socket.id} (${user.email})`);

    // Contest room — leaderboard updates
    socket.on('join:contest', async (contestId) => {
      try {
        if (!mongoose.isValidObjectId(contestId)) {
          socket.emit('socket:error', { message: 'Invalid contest room' });
          return;
        }

        const contest = await Contest.findById(contestId).select('status');
        if (!contest) {
          socket.emit('socket:error', { message: 'Contest not found' });
          return;
        }

        if (!isAdminRole(user.role)) {
          const registration = await Registration.findOne({
            userId: user._id,
            contestId,
            status: 'confirmed',
          }).select('_id');

          if (!registration) {
            socket.emit('socket:error', { message: 'Not allowed to join this contest room' });
            return;
          }
        }

        socket.join(`contest:${contestId}`);
      } catch (error) {
        socket.emit('socket:error', { message: 'Unable to join contest room right now' });
      }
    });

    socket.on('leave:contest', (contestId) => {
      socket.leave(`contest:${contestId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (${user.email})`);
    });
  });
};
