import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import type { JwtAccessPayload, JwtRefreshPayload, UserRole } from "@adhikaripay/shared-types";

export function signAccessToken(payload: { id: string; uid: string; role: UserRole }): string {
  const claims: JwtAccessPayload = { sub: payload.id, uid: payload.uid, role: payload.role, type: "access" };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const claims: JwtRefreshPayload = { sub: userId, type: "refresh", jti };
  const token = jwt.sign(claims, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  return { token, jti };
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
}
