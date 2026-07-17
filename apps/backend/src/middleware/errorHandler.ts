import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

/** Drizzle wraps PG errors in `cause` — walk the chain so we can map schema misses. */
function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 6; depth += 1) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = cur.cause;
      continue;
    }
    if (typeof cur === "object" && cur !== null && "message" in cur) {
      parts.push(String((cur as { message: unknown }).message));
      cur = (cur as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return parts.join(" | ");
}

function isHttpErrorLike(err: unknown): err is HttpError {
  if (err instanceof HttpError) return true;
  if (typeof err !== "object" || err === null) return false;
  const e = err as { statusCode?: unknown; message?: unknown; code?: unknown; errors?: unknown };
  return typeof e.statusCode === "number" && typeof e.message === "string";
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (isHttpErrorLike(err)) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");

  const msg = collectErrorText(err);
  if (/column "?\w+"? does not exist/i.test(msg) || /relation "?\w+"? does not exist/i.test(msg)) {
    res.status(500).json({
      success: false,
      message: "Database is out of date. Run npm run db:migrate and restart the backend.",
      code: "DB_SCHEMA_OUTDATED",
    });
    return;
  }

  res.status(500).json({ success: false, message: "Internal server error" });
}
