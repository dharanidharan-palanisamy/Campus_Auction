import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded from either the current directory or apps/api/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let isConnecting = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    // Wait for in-flight connection
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
    });
    return mongoose;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_auction';

  try {
    isConnecting = true;

    // Mask credentials for safe logging
    const safeUri = mongoUri.replace(
      /\/\/[^:]+:[^@]+@/,
      '//***:***@'
    );
    console.log(`[Database] Connecting to MongoDB: ${safeUri}`);

    await mongoose.connect(mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('[Database] MongoDB connected successfully');
    return mongoose;
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected. Attempting reconnection...');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB error:', err);
});

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected gracefully');
  }
}

export default mongoose;
