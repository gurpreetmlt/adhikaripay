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
  /** Comma-separated list of allowed origins (one per web portal) — e.g. "https://a.com,https://b.com" */
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /**
   * Temporary testing toggle — echoes the OTP in the API response even in production.
   * SECURITY: with this on, anyone who knows a registered mobile number can log into that
   * account without SMS access. Only safe while no real SMS provider is wired up (so no real
   * OTP delivery exists to bypass anyway). Turn this off the moment SMS delivery goes live.
   */
  EXPOSE_OTP_IN_RESPONSE: z.coerce.boolean().default(false),
  /**
   * Allow stub/mock provider adapters to serve traffic in production. Default false: with real
   * providers not yet integrated, a mock returns "success" for any AEPS/DMT/BBPS call, which
   * would let a retailer mint float without a real bank payout. Only turn this on in dev/staging.
   */
  ALLOW_STUB_PROVIDERS: z.coerce.boolean().default(false),
  /**
   * Hard ceiling (in rupees) on a single admin manual wallet top-up. Manual funding mints float
   * from outside the system, so an unbounded call is the biggest single-action money risk. Raise
   * deliberately if a genuine large reconciliation needs it; a real dual-approval workflow should
   * replace this ceiling before scale.
   */
  MAX_MANUAL_FUND_RUPEES: z.coerce.number().positive().default(500000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
