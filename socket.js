import { Server } from 'socket.io';
import logger from './logger.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    socket.on('join_order', (orderId) => {
      socket.join(`order_${orderId}`);
      logger.info(`User joined order room: ${orderId}`);
    });

    socket.on('join_notifications', () => {
      socket.join('notifications');
      logger.info(`User joined notifications room: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      logger.info('User disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitOrderUpdate = (orderId, status) => {
  if (io) {
    io.to(`order_${orderId}`).emit('order_status_updated', { orderId, status });
  }
};

export const emitNotification = (notification) => {
  if (io) {
    io.to('notifications').emit('notification', notification);
  }
};
