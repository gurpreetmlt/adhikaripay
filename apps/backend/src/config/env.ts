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
   * Dev-only: echo OTP in API response for local testing without SMS.
   * SECURITY: Ignored when NODE_ENV=production (always false). Opt-in even in development.
   */
  EXPOSE_OTP_IN_RESPONSE: z.coerce.boolean().default(false),
  /**
   * Comma-separated "mobile:otp" pairs that receive a FIXED login OTP instead of a random one
   * (e.g. "9333333333:222222,9444444444:333333"). Interim until an SMS provider is integrated,
   * and useful for Play Store review accounts. Works in production but ONLY for listed numbers —
   * everyone else still gets a random OTP they can never see, so keep this list to test accounts.
   */
  TEST_OTP_OVERRIDES: z.string().default(""),
  /**
   * Pre-launch switch. Keep false only while transaction PIN onboarding is intentionally disabled.
   * Set true before any real-money provider is enabled.
   */
  REQUIRE_TXN_PIN: z.coerce.boolean().default(false),
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
  /** Hard ceiling (rupees) on flat commission overrides per transaction. */
  MAX_FLAT_COMMISSION_RUPEES: z.coerce.number().positive().default(500),
  /**
   * How often to auto-recheck pending / crash-stale initiated txns (ms).
   * Set 0 to disable the worker. Default 5 minutes.
   */
  TXN_RECONCILE_INTERVAL_MS: z.coerce.number().int().min(0).default(5 * 60 * 1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

/** Never expose OTP over the wire in production, even if the env flag is mis-set. */
export function shouldExposeOtpInResponse(): boolean {
  return env.NODE_ENV !== "production" && env.EXPOSE_OTP_IN_RESPONSE;
}

/**
 * Fixed OTP for a whitelisted test number (TEST_OTP_OVERRIDES), or null.
 * A "*:otp" entry applies to ALL numbers (pre-launch only — remove once SMS provider is live).
 * Exact number entries win over the wildcard.
 */
export function getTestOtpOverride(mobile: string): string | null {
  if (!env.TEST_OTP_OVERRIDES) return null;
  let wildcard: string | null = null;
  for (const pair of env.TEST_OTP_OVERRIDES.split(",")) {
    const [num, otp] = pair.trim().split(":");
    if (!otp || !/^\d{6}$/.test(otp)) continue;
    if (num === mobile) return otp;
    if (num === "*") wildcard = otp;
  }
  return wildcard;
}
