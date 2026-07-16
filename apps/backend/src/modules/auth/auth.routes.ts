import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  requestOtp,
  verifyOtp,
  mpinLogin,
  setMpin,
  listDevices,
  revokeDevice,
  signupRequest,
  signupVerify,
  setTransactionPin,
  verifyTransactionPin,
} from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { authLimiter, otpRequestLimiter } from "../../middleware/rateLimiter";

export const authRouter = Router();

authRouter.post("/register", requireAuth, register);
authRouter.post("/login", authLimiter, login);
authRouter.post("/refresh", authLimiter, refresh);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);

authRouter.post("/otp/request", otpRequestLimiter, requestOtp);
authRouter.post("/otp/verify", authLimiter, verifyOtp);

authRouter.post("/mpin/login", authLimiter, mpinLogin);
authRouter.post("/mpin/set", requireAuth, setMpin);

authRouter.get("/devices", requireAuth, listDevices);
authRouter.post("/devices/:id/revoke", requireAuth, revokeDevice);

authRouter.post("/signup/request", otpRequestLimiter, signupRequest);
authRouter.post("/signup/verify", authLimiter, signupVerify);

authRouter.post("/txn-pin", requireAuth, setTransactionPin);
authRouter.post("/txn-pin/verify", requireAuth, authLimiter, verifyTransactionPin);
