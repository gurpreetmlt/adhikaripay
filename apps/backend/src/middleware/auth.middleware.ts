import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";
import type { JwtAccessPayload } from "@adhikaripay/shared-types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtAccessPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or malformed Authorization header", "UNAUTHENTICATED");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") throw new Error("wrong token type");
    req.auth = payload;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired access token", "UNAUTHENTICATED");
  }
}
