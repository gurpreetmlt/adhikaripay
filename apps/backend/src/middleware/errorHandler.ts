import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";
import { logger } from "../utils/logger";

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

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
    });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");

  const msg = err instanceof Error ? err.message : String(err);
  if (/column "?\w+"? does not exist/i.test(msg)) {
    res.status(500).json({
      success: false,
      message: "Database is out of date. Run npm run db:migrate and restart the backend.",
      code: "DB_SCHEMA_OUTDATED",
    });
    return;
  }

  res.status(500).json({ success: false, message: "Internal server error" });
}
