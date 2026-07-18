import { env } from "../../../config/env";
import { logger } from "../../../utils/logger";

const DEFAULT_BASE = "https://api.instantpay.in";

export interface InstantPayHeaders {
  outletId: string;
  endpointIp: string;
}

export interface InstantPayApiResponse {
  statuscode?: string;
  actcode?: string;
  status?: string;
  data?: Record<string, unknown> | unknown[] | null;
  timestamp?: string;
  ipay_uuid?: string;
  orderid?: string | null;
  environment?: string;
  [key: string]: unknown;
}

export function instantPayBaseUrl(): string {
  return env.INSTANTPAY_BASE_URL ?? DEFAULT_BASE;
}

export function buildInstantPayHeaders(h: InstantPayHeaders): Record<string, string> {
  if (!env.INSTANTPAY_CLIENT_ID || !env.INSTANTPAY_CLIENT_SECRET) {
    throw new Error("InstantPay credentials missing");
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Ipay-Auth-Code": env.INSTANTPAY_AUTH_CODE,
    "X-Ipay-Client-Id": env.INSTANTPAY_CLIENT_ID,
    "X-Ipay-Client-Secret": env.INSTANTPAY_CLIENT_SECRET,
    "X-Ipay-Outlet-Id": h.outletId,
    "X-Ipay-Endpoint-Ip": h.endpointIp,
  };
}

export async function instantPayPost(
  path: string,
  body: Record<string, unknown>,
  headers: InstantPayHeaders,
): Promise<InstantPayApiResponse> {
  const url = `${instantPayBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: buildInstantPayHeaders(headers),
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error({ err, path }, "InstantPay network error");
    throw err;
  }

  const text = await res.text();
  let json: InstantPayApiResponse;
  try {
    json = text ? (JSON.parse(text) as InstantPayApiResponse) : {};
  } catch {
    json = { statuscode: "ERR", status: text.slice(0, 200), rawText: text };
  }

  logger.info(
    {
      path,
      httpStatus: res.status,
      statuscode: json.statuscode,
      actcode: json.actcode,
      durationMs: Date.now() - started,
      mode: env.AEPS_PROVIDER_MODE,
    },
    "InstantPay response",
  );
  return json;
}

export async function instantPayGet(
  path: string,
  headers: InstantPayHeaders,
): Promise<InstantPayApiResponse> {
  const url = `${instantPayBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: buildInstantPayHeaders(headers) });
  } catch (err) {
    logger.error({ err, path }, "InstantPay network error");
    throw err;
  }

  const text = await res.text();
  let json: InstantPayApiResponse;
  try {
    json = text ? (JSON.parse(text) as InstantPayApiResponse) : {};
  } catch {
    json = { statuscode: "ERR", status: text.slice(0, 200), rawText: text };
  }

  logger.info(
    { path, httpStatus: res.status, statuscode: json.statuscode, durationMs: Date.now() - started, mode: env.AEPS_PROVIDER_MODE },
    "InstantPay response",
  );
  return json;
}

/** InstantPay success codes commonly used on AePS rails. */
export function mapInstantPayStatus(res: InstantPayApiResponse): "success" | "failed" | "pending" {
  const code = String(res.statuscode ?? "").toUpperCase();
  if (code === "TXN" || code === "TUP") {
    // TUP = transaction under process on some InstantPay rails
    return code === "TUP" ? "pending" : "success";
  }
  if (code === "UAD" || code === "PEN" || code === "PENDING") return "pending";
  return "failed";
}

export interface OutletLoginStatusResult {
  /** true = outlet already 2FA'd today (actcode LOGGEDIN); false = LOGINREQUIRED / anything else. */
  loggedIn: boolean;
  actcode: string;
  aadhaarLastFour: string | null;
  isFaceAuthAvailable: boolean;
  isTxnBioLoginRequired: boolean;
  raw: InstantPayApiResponse;
}

/**
 * Outlet Login Status — checks whether the merchant has completed today's 2FA.
 * actcode LOGGEDIN → ready; LOGINREQUIRED → run Outlet Login (daily 2FA) first.
 */
export async function instantPayOutletLoginStatus(
  outletId: string,
  endpointIp: string,
): Promise<OutletLoginStatusResult> {
  const res = await instantPayPost("/fi/aeps/outletLoginStatus", {}, { outletId, endpointIp });
  const actcode = String(res.actcode ?? "").toUpperCase();
  const data = (res.data && !Array.isArray(res.data) ? res.data : {}) as Record<string, unknown>;
  return {
    loggedIn: actcode === "LOGGEDIN",
    actcode,
    aadhaarLastFour: typeof data.aadhaarLastFour === "string" ? data.aadhaarLastFour : null,
    isFaceAuthAvailable: Boolean(data.isFaceAuthAvailable),
    isTxnBioLoginRequired: Boolean(data.isTxnBioLoginRequired),
    raw: res,
  };
}
