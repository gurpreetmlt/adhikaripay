import mongoose from 'mongoose';
import { getEnv } from '@adhikaripay/config';

let isConnected = false;

export async function connectDb(uri?: string): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const connectionUri = uri ?? getEnv().MONGODB_URI;
  mongoose.set('strictQuery', true);

  await mongoose.connect(connectionUri);
  isConnected = true;

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
  });

  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

export { mongoose };
