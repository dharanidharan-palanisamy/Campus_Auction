import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export const initSocket = (io: SocketIOServer) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Join specific auction room
    socket.on('join_auction', (auctionId: string) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('leave_auction', (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
    });

    // Authenticated user room for direct notifications
    socket.on('join_user', (userId: string) => {
      socket.join(`user:${userId}`);
    });
  });
};

export const getIO = (): SocketIOServer | null => {
  return ioInstance;
};

export const emitAuctionUpdate = (auctionId: string, event: string, payload: any) => {
  if (ioInstance) {
    ioInstance.to(`auction:${auctionId}`).emit(event, payload);
  }
};

export const emitUserNotification = (userId: string, notification: any) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification:created', notification);
  }
};
