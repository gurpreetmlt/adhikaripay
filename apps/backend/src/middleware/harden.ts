import type { NextFunction, Request, Response } from "express";

// Hand-rolled replacement for `hpp` + `express-mongo-sanitize`. Both packages reassign
// `req.query` wholesale (`req.query = clean(...)`), which throws in Express 5 because
// `req.query` is a getter-only property there. Mutating the existing object in place
// (deleting/overwriting its own keys) is allowed and achieves the same protection.

const OPERATOR_KEY = /^\$|\./;

function sanitizeInPlace(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) sanitizeInPlace(item);
    return;
  }
  if (value === null || typeof value !== "object") return;

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (OPERATOR_KEY.test(key)) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    sanitizeInPlace((value as Record<string, unknown>)[key]);
  }
}

// Collapses duplicate query params (?a=1&a=2) down to their last value, in place.
function preventParamPollution(query: Record<string, unknown>): void {
  for (const key of Object.keys(query)) {
    const value = query[key];
    if (Array.isArray(value)) {
      query[key] = value[value.length - 1];
    }
  }
}

export function hardenRequest(req: Request, _res: Response, next: NextFunction): void {
  preventParamPollution(req.query as Record<string, unknown>);
  sanitizeInPlace(req.query);
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.params);
  next();
}
