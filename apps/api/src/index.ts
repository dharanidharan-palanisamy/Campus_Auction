import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import { connectDatabase, disconnectDatabase } from './config/database';
import { initSocket } from './lib/socket';
import { authRouter } from './routes/auth.routes';
import { auctionRouter } from './routes/auction.routes';
import { studentRouter } from './routes/student.routes';
import { adminRouter } from './routes/admin.routes';
import { assistantRouter } from './routes/assistant.routes';

// Load environment variables from current directory, apps/api/.env, or root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const server = http.createServer(app);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000') return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Allow all Vercel domains (production & preview deployments)
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  if (process.env.CLIENT_ORIGIN) {
    const origins = process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
    if (origins.includes(origin) || origins.includes('*')) return true;
  }
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
  const listenPort = Number(PORT) || 4000;
  // Connect to MongoDB before accepting connections
  connectDatabase()
    .then(() => {
      server.listen(listenPort, '0.0.0.0', () => {
        console.log(`🚀 Campus Auction API & Socket.IO running on 0.0.0.0:${listenPort}`);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB on startup:', err);
      // Still listen so healthcheck / error responses work
      server.listen(listenPort, '0.0.0.0', () => {
        console.log(`⚠️ Campus Auction API running on 0.0.0.0:${listenPort} (Database pending connection)`);
      });
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server gracefully...');
  await disconnectDatabase();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server gracefully...');
  await disconnectDatabase();
  server.close(() => process.exit(0));
});

export { app, server };
