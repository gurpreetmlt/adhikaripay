import { createApp } from "./app";
import { env } from "./config/env";
import { pgPool } from "./db/postgres";
import { deleteExpiredOtpRequests } from "./db/postgres/repositories/otpRequest";
import { logger } from "./utils/logger";

const OTP_SWEEP_INTERVAL_MS = 30 * 60 * 1000;

async function main() {
  await pgPool.query("SELECT 1");
  logger.info("PostgreSQL connected");

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Adhikari Pay backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // No native TTL in Postgres like Mongo had — periodically sweep expired OTP rows.
  const otpSweepTimer = setInterval(() => {
    deleteExpiredOtpRequests().catch((err: unknown) =>
      logger.error({ err }, "failed to sweep expired OTP requests"),
    );
  }, OTP_SWEEP_INTERVAL_MS);

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    clearInterval(otpSweepTimer);
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
