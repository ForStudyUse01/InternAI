import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { logError } from "./utils/logger";

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      if (env.nodeEnv !== "production") {
        // eslint-disable-next-line no-console
        console.log(`Server listening on port ${env.port}`);
      }
    });
  } catch (error) {
    logError("Failed to bootstrap server", error);
    process.exit(1);
  }
}

void bootstrap();
