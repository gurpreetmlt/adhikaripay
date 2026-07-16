import { Platform } from "react-native";

/**
 * Talks to the local "L1 RD Service" HTTP server that biometric device apps (Mantra RDService,
 * and others built to the same L1 spec) run on-device — e.g. http://127.0.0.1:11101 for the
 * Mantra MFS110 app. This is a different integration path than the older Android-Intent-based
 * RD Service contract; confirmed from the on-device app itself, which shows "Device connected"
 * and exposes http://127.0.0.1:11101 / https://127.0.0.1:11101 directly in its UI. The port has
 * been observed to vary between app restarts (11101 vs 11100), hence trying both.
 *
 * No native module needed for this — it's a plain local HTTP call, so this class talks to it
 * with `fetch`. Requires `network_security_config.xml` to allow cleartext to 127.0.0.1 (Android
 * blocks plain HTTP by default).
 */

const RD_SERVICE_PORTS = [11100, 11101, 11102];
const RD_HTTP_TIMEOUT_MS = 4000;
const CAPTURE_TIMEOUT_MS = 20000;

// The L1 RD Service spec (UIDAI) uses non-standard HTTP verbs ("DEVICEINFO", "CAPTURE") sent to
// the service root — NOT REST-style sub-paths like "/rd/info". A prior attempt at GET /rd/info
// got HTTP 405 (Method Not Allowed) on a port that was clearly listening, which confirms the path
// and/or verb was wrong, not that nothing was there. This probes multiple verb/path combinations
// per port and keeps a full log so the exact working combination can be identified from the log
// if none of these guesses hit either.
const INFO_ATTEMPTS: { method: string; path: string }[] = [
  { method: "DEVICEINFO", path: "/" },
  { method: "RDSERVICE", path: "/" },
  { method: "GET", path: "/" },
  { method: "POST", path: "/" },
  { method: "DEVICEINFO", path: "/rd/info" },
  { method: "GET", path: "/rd/info" },
  { method: "POST", path: "/rd/info" },
  { method: "MOSIP.DISC", path: "/" },
];

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Last set of per-port probe results, for surfacing a diagnostic message when nothing is found. */
let lastProbeLog: string[] = [];

/**
 * Finds which local port + verb/path combo the RD Service actually responds to. Returns the port
 * and the specific { method, path } that worked, since capture must use whichever base URL style
 * the info probe found (root vs "/rd/...") to have any chance of matching this device's server.
 */
async function findRdService(): Promise<{ port: number; method: string; path: string } | null> {
  lastProbeLog = [];
  for (const port of RD_SERVICE_PORTS) {
    for (const attempt of INFO_ATTEMPTS) {
      const url = `http://127.0.0.1:${port}${attempt.path}`;
      try {
        const res = await fetchWithTimeout(url, { method: attempt.method }, RD_HTTP_TIMEOUT_MS);
        if (res.status === 405) {
          // 405 means the server IS there and parsed the request, but rejects this verb — the
          // "Allow" header (if the server sets one) names the verb(s) it actually accepts, which
          // beats further guessing. Also grab a body snippet in case the vendor documents allowed
          // methods in the response text instead.
          const allow = res.headers.get("Allow") ?? res.headers.get("allow");
          const bodySnippet = (await res.text().catch(() => "")).slice(0, 150);
          lastProbeLog.push(
            `${attempt.method} ${url} -> HTTP 405${allow ? ` (Allow: ${allow})` : ""}${bodySnippet ? ` body: ${bodySnippet}` : ""}`,
          );
          // A 405 means something is definitely listening on this port/path and understood HTTP.
          // Some vendor RD services reject our probe verb/path guesses for DEVICEINFO but still work
          // for capture, so treat 405 as "service found" instead of showing "RD Service not found".
          return { port, method: attempt.method, path: attempt.path };
        } else {
          lastProbeLog.push(`${attempt.method} ${url} -> HTTP ${res.status}`);
        }
        if (res.ok) return { port, method: attempt.method, path: attempt.path };
      } catch (err) {
        lastProbeLog.push(
          `${attempt.method} ${url} -> ${err instanceof Error ? err.name + ": " + err.message : String(err)}`,
        );
      }
    }
  }
  return null;
}

/** True if a local RD Service HTTP server is reachable on this device. */
export async function isRdServiceAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return (await findRdService()) !== null;
}

/** Diagnostic detail from the most recent isRdServiceAvailable()/captureFingerprint() probe. */
export function getRdServiceProbeLog(): string {
  return lastProbeLog.length ? lastProbeLog.join("\n") : "(no probe attempted yet)";
}

function buildPidOptionsXml(timeoutMs: number): string {
  return `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P" wadh=""/><Demo><Pi ms="E" mv="255" name=""/><Pa ms="E" mv="255"/></Demo><CustOpts/></PidOptions>`;
}

/** Pulls errCode/errInfo out of a capture response if the RD Service wrapped an error. */
function extractError(xml: string): string | null {
  const errCodeMatch = xml.match(/errCode="(-?\d+)"/);
  if (!errCodeMatch || errCodeMatch[1] === "0") return null;
  const errInfoMatch = xml.match(/errInfo="([^"]*)"/);
  return errInfoMatch?.[1] || `RD Service error code ${errCodeMatch[1]}`;
}

/**
 * Captures a fingerprint via the local RD Service HTTP server and resolves with the raw signed
 * PID block XML — exactly what the backend's `biometricPayload` field expects.
 */
export async function captureFingerprint(): Promise<string> {
  if (Platform.OS !== "android") {
    throw new Error("Biometric capture is only supported on Android");
  }

  const found = await findRdService();
  if (found === null) {
    throw new Error(
      `No RD Service app found running locally.\n\n${getRdServiceProbeLog()}`,
    );
  }

  const pidOptions = buildPidOptionsXml(CAPTURE_TIMEOUT_MS);
  const headers = { "Content-Type": "text/xml" };
  // Capture requests go to the same base path the info probe found working (root vs "/rd/..."),
  // trying the documented custom verb "CAPTURE" before falling back to plain POST.
  const captureUrls = [
    `http://127.0.0.1:${found.port}${found.path}`,
    `http://127.0.0.1:${found.port}/rd/capture`,
    `http://127.0.0.1:${found.port}/capture`,
    `http://127.0.0.1:${found.port}/`,
  ].filter((url, index, arr) => arr.indexOf(url) === index);

  // fetch() only throws on a genuine network failure, never for HTTP error statuses (404/405/500),
  // so a successful fetch to the wrong URL must NOT stop the search — keep trying candidates until
  // one actually returns 2xx, or we run out.
  let res: Response | undefined;
  let lastNonOkStatus: { url: string; method: string; status: number; body: string } | undefined;
  const attemptErrors: string[] = [];
  outer: for (const url of captureUrls) {
    for (const method of ["CAPTURE", "POST"]) {
      try {
        const attempt = await fetchWithTimeout(url, { method, headers, body: pidOptions }, CAPTURE_TIMEOUT_MS + 5000);
        if (attempt.ok) {
          res = attempt;
          break outer;
        }
        lastNonOkStatus = { url, method, status: attempt.status, body: (await attempt.text().catch(() => "")).slice(0, 200) };
        attemptErrors.push(`${method} ${url} -> HTTP ${attempt.status}`);
      } catch (err) {
        attemptErrors.push(`${method} ${url} -> ${err instanceof Error ? err.name + ": " + err.message : String(err)}`);
      }
    }
  }

  if (!res) {
    const timedOut = attemptErrors.some((e) => e.includes("AbortError"));
    if (timedOut) {
      throw new Error("Scanner did not respond in time. Check the device connection and try again.");
    }
    if (lastNonOkStatus) {
      throw new Error(
        extractError(lastNonOkStatus.body) ??
          `RD Service rejected the capture request (HTTP ${lastNonOkStatus.status}).\n${attemptErrors.join("\n")}`,
      );
    }
    throw new Error(`Could not reach the RD Service for capture.\n${attemptErrors.join("\n")}`);
  }

  const body = await res.text();
  const error = extractError(body);
  if (error) throw new Error(error);
  if (!body.trim()) throw new Error("RD Service returned no PID data");

  return body;
}
