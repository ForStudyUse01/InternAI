import mongoose from "mongoose";
import { env } from "./env";
import { logError } from "../utils/logger";

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
  } catch (error) {
    logError("MongoDB connection failed", error);
    throw error;
  }
}
