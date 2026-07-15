import { createApp } from "./app";
import { env } from "./config/env";
import { pgPool } from "./db/postgres";
import { connectMongo } from "./db/mongo";
import { logger } from "./utils/logger";

async function main() {
  await pgPool.query("SELECT 1");
  logger.info("PostgreSQL connected");

  await connectMongo();
  logger.info("MongoDB connected");

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Adhikari Pay backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await pgPool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
