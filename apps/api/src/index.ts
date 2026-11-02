import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { initSocket } from './lib/socket';
import { authRouter } from './routes/auth.routes';
import { auctionRouter } from './routes/auction.routes';
import { studentRouter } from './routes/student.routes';
import { adminRouter } from './routes/admin.routes';
import { assistantRouter } from './routes/assistant.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') return true;
  if (origin === process.env.CLIENT_ORIGIN) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin denied'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSocket(io);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin denied'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'campus-auction-api', timestamp: new Date() });
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auctions', auctionRouter);
app.use('/api/v1/student', studentRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/assistant', assistantRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Campus Auction API & Socket.IO running on port ${PORT}`);
  });
}

export { app, server };
