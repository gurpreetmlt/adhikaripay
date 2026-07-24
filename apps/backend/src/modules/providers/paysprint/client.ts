import { createCipheriv, createDecipheriv } from "node:crypto";
import jwt from "jsonwebtoken";
import { env, isPaySprintAepsMode } from "../../../config/env";
import { logger } from "../../../utils/logger";

/**
 * PaySprint docs (PaySprint/Unimplemented/) leave several implementation details as
 * "confirm with PaySprint": UAT base URL and AES mode/padding. JWT timestamp unit confirmed
 * 2026-07-21 (seconds, per Authentication doc prose). AES default below is best-effort
 * (AES-128-CBC/PKCS7) —
 * verify against a real PaySprint sandbox response before trusting money-moving calls.
 */

export interface PaySprintApiResponse {
  status?: boolean | number;
  response_code?: number | string;
  message?: string;
  data?: Record<string, unknown> | unknown[] | null;
  ackno?: string;
  referenceid?: string;
  utr?: string;
  [key: string]: unknown;
}

export function paySprintBaseUrl(): string {
  if (env.AEPS_PROVIDER_MODE === "paysprint_live") return env.PAYSPRINT_LIVE_BASE_URL;
  if (!env.PAYSPRINT_UAT_BASE_URL) {
    throw new Error("PAYSPRINT_UAT_BASE_URL not set — required for paysprint_sandbox mode");
  }
  return env.PAYSPRINT_UAT_BASE_URL;
}

/** JWT per PaySprint sample payload: { timestamp, partnerId, reqid }, HS256, `Token` header. */
export function buildPaySprintToken(): string {
  if (!env.PAYSPRINT_JWT_SECRET || !env.PAYSPRINT_PARTNER_ID) {
    throw new Error("PaySprint JWT credentials missing");
  }
  const timestamp =
    env.PAYSPRINT_JWT_TIMESTAMP_UNIT === "s" ? Math.floor(Date.now() / 1000) : Date.now();
  return jwt.sign(
    { timestamp, partnerId: env.PAYSPRINT_PARTNER_ID, reqid: String(Date.now()) },
    env.PAYSPRINT_JWT_SECRET,
    { algorithm: "HS256" },
  );
}

export function buildPaySprintHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Token: buildPaySprintToken(),
  };
  // UAT-only per docs; Live explicitly does not need it.
  if (env.AEPS_PROVIDER_MODE === "paysprint_sandbox" && env.PAYSPRINT_AUTHORISED_KEY) {
    headers.Authorisedkey = env.PAYSPRINT_AUTHORISED_KEY;
  }
  return headers;
}

/**
 * AES-128-CBC/PKCS7 — docs only confirm "AES-128 with key+iv provided by API provider" without
 * naming mode/padding explicitly; CBC/PKCS7 is the common default. Confirm with PaySprint before
 * relying on this for a live money-moving body.
 */
export function paySprintEncrypt(plainText: string): string {
  if (!env.PAYSPRINT_AES_KEY || !env.PAYSPRINT_AES_IV) {
    throw new Error("PaySprint AES key/iv missing");
  }
  const cipher = createCipheriv(
    "aes-128-cbc",
    Buffer.from(env.PAYSPRINT_AES_KEY, "utf8"),
    Buffer.from(env.PAYSPRINT_AES_IV, "utf8"),
  );
  return Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]).toString("hex");
}

export function paySprintDecrypt(cipherHex: string): string {
  if (!env.PAYSPRINT_AES_KEY || !env.PAYSPRINT_AES_IV) {
    throw new Error("PaySprint AES key/iv missing");
  }
  const decipher = createDecipheriv(
    "aes-128-cbc",
    Buffer.from(env.PAYSPRINT_AES_KEY, "utf8"),
    Buffer.from(env.PAYSPRINT_AES_IV, "utf8"),
  );
  return Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]).toString(
    "utf8",
  );
}

export async function paySprintPost(
  path: string,
  body: Record<string, unknown>,
): Promise<PaySprintApiResponse> {
  if (!isPaySprintAepsMode()) {
    throw new Error("paySprintPost called outside a paysprint_* AEPS_PROVIDER_MODE");
  }
  const url = `${paySprintBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: buildPaySprintHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error({ err, path }, "PaySprint network error");
    throw err;
  }

  const text = await res.text();
  let json: PaySprintApiResponse;
  try {
    json = text ? (JSON.parse(text) as PaySprintApiResponse) : {};
  } catch {
    json = { status: false, message: text.slice(0, 200), rawText: text };
  }

  logger.info(
    {
      path,
      httpStatus: res.status,
      status: json.status,
      response_code: json.response_code,
      durationMs: Date.now() - started,
      mode: env.AEPS_PROVIDER_MODE,
    },
    "PaySprint response",
  );

  return json;
}
