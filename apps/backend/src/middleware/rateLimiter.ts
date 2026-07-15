import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isDev = env.NODE_ENV !== "production";

const sharedValidate = {
  trustProxy: false,
  xForwardedForHeader: false,
  keyGeneratorIpFallback: false,
} as const;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: sharedValidate,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 200 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: sharedValidate,
});

export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 50 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: sharedValidate,
});

export const walletTxnLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).auth?.sub ?? req.ip ?? "unknown",
  validate: sharedValidate,
});
