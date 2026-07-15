import type { Response } from "express";

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data, message });
}
