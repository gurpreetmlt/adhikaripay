import mongoose from "mongoose";
import { env } from "../../config/env";

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  return mongoose.connect(env.MONGODB_URI);
}

export { mongoose };
