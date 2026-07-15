import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  otpRequestSchema,
  otpVerifySchema,
  signupRequestSchema,
  signupVerifySchema,
} from "./auth.validators";
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  requestLoginOtp,
  verifyLoginOtp,
  loginWithMpin,
  setLoginMpin,
  requestSignupOtp,
  verifySignupOtp,
  getAuthMe,
} from "./auth.service";
import { setTxnPin, verifyTxnPinOrThrow } from "./txnPin";
import { db } from "../../db/postgres";
import { users } from "../../db/postgres/schema";
import { comparePassword } from "../../utils/password";
import { sendSuccess } from "../../utils/apiResponse";
import { HttpError } from "../../utils/httpError";
import { mpinLoginSchema, setLoginMpinSchema } from "./auth.validators";

export async function register(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const input = registerSchema.parse(req.body);
  const user = await registerUser({ id: req.auth.sub, role: req.auth.role }, input);
  sendSuccess(res, user, "User onboarded successfully", 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const result = await loginUser(input, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  sendSuccess(res, result, "Logged in successfully");
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const input = refreshSchema.parse(req.body);
  const result = await refreshSession(input.refreshToken);
  sendSuccess(res, result, "Session refreshed");
}

export async function logout(req: Request, res: Response): Promise<void> {
  const input = refreshSchema.parse(req.body);
  await logoutUser(input.refreshToken);
  sendSuccess(res, null, "Logged out successfully");
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const user = await getAuthMe(req.auth.sub);
  sendSuccess(res, { user }, "OK");
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const input = otpRequestSchema.parse(req.body);
  const result = await requestLoginOtp(input, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  sendSuccess(res, result, result.message);
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const input = otpVerifySchema.parse(req.body);
  const result = await verifyLoginOtp(input, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  sendSuccess(res, result, "Logged in successfully");
}

export async function mpinLogin(req: Request, res: Response): Promise<void> {
  const input = mpinLoginSchema.parse(req.body);
  const result = await loginWithMpin(input, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  sendSuccess(res, result, "Logged in successfully");
}

export async function setMpin(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const input = setLoginMpinSchema.parse(req.body);
  const user = await setLoginMpin(req.auth.sub, input);
  sendSuccess(res, { user }, "Login MPIN set successfully");
}

export async function signupRequest(req: Request, res: Response): Promise<void> {
  const input = signupRequestSchema.parse(req.body);
  const result = await requestSignupOtp(input, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  sendSuccess(res, result, result.message);
}

export async function signupVerify(req: Request, res: Response): Promise<void> {
  const input = signupVerifySchema.parse(req.body);
  const result = await verifySignupOtp(input, {
    ipAddress: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  });
  sendSuccess(res, result, "Account created successfully", 201);
}

const setTxnPinSchema = z.object({
  password: z.string().min(1).optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export async function setTransactionPin(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const input = setTxnPinSchema.parse(req.body);

  const [user] = await db.select().from(users).where(eq(users.id, req.auth.sub));
  if (!user) throw new HttpError(404, "User not found", "USER_NOT_FOUND");

  const isFirstSet = !user.txnPinHash;
  let passwordOk = false;
  if (!isFirstSet) {
    if (!input.password) {
      throw new HttpError(422, "Password is required to change PIN", "PASSWORD_REQUIRED");
    }
    passwordOk = await comparePassword(input.password, user.passwordHash);
  }

  await setTxnPin(req.auth.sub, input.pin, { passwordOk, isFirstSet });
  const meUser = await getAuthMe(req.auth.sub);
  sendSuccess(res, { user: meUser }, "Transaction PIN set successfully");
}

const verifyTxnPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export async function verifyTransactionPin(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw new HttpError(401, "Authentication required", "UNAUTHENTICATED");
  const input = verifyTxnPinSchema.parse(req.body);
  await verifyTxnPinOrThrow(req.auth.sub, input.pin);
  sendSuccess(res, { valid: true }, "Transaction PIN verified");
}
