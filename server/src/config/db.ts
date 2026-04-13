import mongoose from "mongoose";
import { env } from "./env";
import { logError } from "../utils/logger";

let embeddedMongo: import("mongodb-memory-server").MongoMemoryServer | undefined;

export async function connectDatabase(): Promise<void> {
  try {
    let uri = env.mongodbUri;
    if (uri === "embedded") {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      embeddedMongo = await MongoMemoryServer.create();
      uri = embeddedMongo.getUri();
    }
    await mongoose.connect(uri);
  } catch (error) {
    logError("MongoDB connection failed", error);
    throw error;
  }
}
