/**
 * Browser → local Mantra / Morpho L1 RD Service (Windows).
 *
 * Mantra requires HTTP method "CAPTURE" (UIDAI). Browser fetch() often cannot send
 * custom verbs reliably — use XMLHttpRequest (same as Mantra/Eko sample apps).
 */

const CACHE_KEY = "adhikaripay_rd_endpoint_v2";
const PORT_START = 11100;
const PORT_END = 11120; // Mantra docs: 11100–11120
const PRIORITY_PORTS = [11100, 11101, 11102, 11120, 11103];
const PROBE_MS = 2500;
const CAPTURE_MS = 25000;
const BATCH = 6;

type Scheme = "http" | "https";

export interface RdEndpoint {
  port: number;
  scheme: Scheme;
  capturePath: string;
}

let lastLog: string[] = [];

function orderedPorts(): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const p of PRIORITY_PORTS) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  for (let p = PORT_START; p <= PORT_END; p++) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

/** XHR supports custom methods like CAPTURE / RDSERVICE (fetch often does not). */
function xhrRequest(
  method: string,
  url: string,
  body: string | null,
  timeoutMs: number,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    xhr.setRequestHeader("Accept", "text/xml, application/xml, */*");
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? "" });
    xhr.onerror = () => reject(new Error("Network error (CORS / private network / cert?)"));
    xhr.ontimeout = () => reject(new Error("Timeout — place finger on scanner within time"));
    xhr.send(body);
  });
}

function loadCache(): RdEndpoint | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as RdEndpoint;
    if (
      typeof p.port === "number" &&
      (p.scheme === "http" || p.scheme === "https") &&
      typeof p.capturePath === "string"
    ) {
      return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveCache(ep: RdEndpoint) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(ep));
  } catch {
    /* ignore */
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem("adhikaripay_rd_endpoint");
  } catch {
    /* ignore */
  }
}

function parseCapturePathFromInfo(xml: string): string | null {
  // Some RD INFO responses include path attributes or CapturePath
  const m =
    xml.match(/capturePath="([^"]+)"/i) ||
    xml.match(/<CapturePath>([^<]+)<\/CapturePath>/i) ||
    xml.match(/path="(\/?rd\/capture)"/i);
  if (!m?.[1]) return null;
  const path = m[1].trim();
  return path.startsWith("/") ? path : `/${path}`;
}

/** Probe: RDSERVICE or GET — any response means RD is alive. */
async function probeEndpoint(port: number, scheme: Scheme): Promise<RdEndpoint | null> {
  const base = `${scheme}://127.0.0.1:${port}`;
  for (const path of ["/", "/rd/info", "/rd/service"]) {
    for (const method of ["RDSERVICE", "DEVICEINFO", "GET"]) {
      try {
        const res = await xhrRequest(method, `${base}${path}`, null, PROBE_MS);
        // Any HTTP status (incl. 405/404 with body) = listener up
        if (res.status > 0 || res.text.length > 0) {
          const capturePath = parseCapturePathFromInfo(res.text) ?? "/rd/capture";
          return { port, scheme, capturePath };
        }
      } catch {
        /* next */
      }
    }
  }
  return null;
}

export async function discoverRdEndpoint(): Promise<RdEndpoint | null> {
  lastLog = [];

  const cached = loadCache();
  if (cached) {
    const alive = await probeEndpoint(cached.port, cached.scheme);
    if (alive) {
      lastLog.push(`Using cached ${cached.scheme}://127.0.0.1:${cached.port}${cached.capturePath}`);
      return { ...cached, capturePath: alive.capturePath || cached.capturePath };
    }
    lastLog.push(`Cached port ${cached.port} dead — scanning…`);
    clearCache();
  }

  const preferHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const schemes: Scheme[] = preferHttps ? ["https", "http"] : ["http", "https"];
  const ports = orderedPorts();

  for (let i = 0; i < ports.length; i += BATCH) {
    const batch = ports.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (port) => {
        for (const scheme of schemes) {
          const ep = await probeEndpoint(port, scheme);
          if (ep) {
            lastLog.push(`Found ${scheme}://127.0.0.1:${port} capture=${ep.capturePath}`);
            return ep;
          }
        }
        return null;
      }),
    );
    const found = results.find((r): r is RdEndpoint => r !== null);
    if (found) {
      saveCache(found);
      return found;
    }
  }
  return null;
}

/** Mantra-friendly PidOptions variants (invalid XML is a common capture failure). */
function pidOptionsVariants(timeoutMs: number): string[] {
  return [
    // L1 common: fType=2 (FMR+FIR), no Demo
    `<PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P"/></PidOptions>`,
    // fType=0 FMR only
    `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P"/></PidOptions>`,
    // With empty CustOpts (some older RD builds)
    `<PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="${timeoutMs}" otp="" wadh="" posh="UNKNOWN" env="P"/><CustOpts></CustOpts></PidOptions>`,
  ];
}

function extractErr(xml: string): { code: string; info: string } | null {
  const code = xml.match(/errCode="(-?\d+)"/);
  if (!code) return null;
  if (code[1] === "0") return null;
  const info = xml.match(/errInfo="([^"]*)"/);
  return { code: code[1], info: info?.[1] || `RD error ${code[1]}` };
}

function looksLikePid(body: string): boolean {
  const t = body.trim();
  return t.includes("<PidData") || t.includes("<Resp") || t.includes("errCode=");
}

async function tryCapture(
  url: string,
  method: string,
  body: string,
  ms: number,
): Promise<{ ok: true; xml: string } | { ok: false; detail: string }> {
  try {
    const res = await xhrRequest(method, url, body, ms);
    const text = res.text;
    const err = extractErr(text);
    if (err) {
      return { ok: false, detail: `${method} ${url} → [${err.code}] ${err.info}` };
    }
    if (looksLikePid(text) && (res.status === 0 || res.status === 200 || text.includes('errCode="0"'))) {
      return { ok: true, xml: text };
    }
    if (looksLikePid(text) && text.includes("<PidData")) {
      return { ok: true, xml: text };
    }
    if (!text.trim()) {
      return { ok: false, detail: `${method} ${url} → empty (HTTP ${res.status})` };
    }
    return {
      ok: false,
      detail: `${method} ${url} → HTTP ${res.status}: ${text.slice(0, 100)}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: `${method} ${url} → ${msg}` };
  }
}

async function captureOn(ep: RdEndpoint): Promise<string> {
  const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
  const paths = Array.from(
    new Set([ep.capturePath, "/rd/capture", "/capture", "/"]),
  );
  const methods = ["CAPTURE", "POST"];
  const optionsList = pidOptionsVariants(CAPTURE_MS);
  const timeoutMs = CAPTURE_MS + 5000;

  const errors: string[] = [];

  // Prefer discovered path + CAPTURE + first PidOptions (Mantra happy path)
  for (const opts of optionsList) {
    for (const path of paths) {
      for (const method of methods) {
        const url = `${base}${path === "/" ? "/" : path}`;
        const r = await tryCapture(url, method, opts, timeoutMs);
        if (r.ok) {
          lastLog.push(`Capture OK ${method} ${url}`);
          saveCache({ ...ep, capturePath: path });
          return r.xml;
        }
        errors.push(r.detail);
        lastLog.push(r.detail);

        // Invalid PidOptions → try next XML variant immediately
        if (r.detail.includes("Invalid") || r.detail.includes("[100]")) {
          break;
        }
        // Device busy / finger — stop hammering other paths
        if (
          r.detail.includes("700") ||
          r.detail.includes("Finger") ||
          r.detail.includes("Timeout") ||
          r.detail.includes("not connected")
        ) {
          throw new Error(r.detail.replace(/^[^→]+→\s*/, "").trim() || r.detail);
        }
      }
    }
  }

  const useful = errors.filter((e) => !e.includes("empty") && !e.includes("HTTP 405"));
  throw new Error(
    useful[0]?.replace(/^[^→]+→\s*/, "").trim() ||
      "Scanner did not return fingerprint data. Open Mantra RDService, place finger when red light is on.",
  );
}

export function getRdProbeLog(): string {
  return lastLog.length ? lastLog.join("\n") : "(no probe yet)";
}

/** Capture fingerprint via local Mantra/Morpho RD Service. Returns PidData XML. */
export async function captureFingerprintWeb(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Fingerprint capture only works in the browser");
  }

  let ep = await discoverRdEndpoint();
  if (!ep) {
    const onHttps = window.location.protocol === "https:";
    throw new Error(
      onHttps
        ? "Mantra RD not found. Enable chrome://flags/#allow-insecure-localhost + disable block-insecure-private-network-requests, open Mantra RDService, then retry. Or test on http://localhost:3001"
        : `Mantra RD Service not found (ports ${PORT_START}–${PORT_END}). Open Mantra L1 RDService on this PC → Device connected.`,
    );
  }

  try {
    return await captureOn(ep);
  } catch (first) {
    clearCache();
    ep = await discoverRdEndpoint();
    if (!ep) throw first;
    return await captureOn(ep);
  }
}
