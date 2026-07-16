import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Optional — cache only (sessions/hot reads). Never queues, jobs, or primary data. */
  REDIS_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  AES_ENCRYPTION_KEY: z.string().min(1, "AES_ENCRYPTION_KEY is required"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /**
   * Temporary testing toggle — echoes the OTP in the API response even in production.
   * SECURITY: with this on, anyone who knows a registered mobile number can log into that
   * account without SMS access. Only safe while no real SMS provider is wired up (so no real
   * OTP delivery exists to bypass anyway). Turn this off the moment SMS delivery goes live.
   */
  EXPOSE_OTP_IN_RESPONSE: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
