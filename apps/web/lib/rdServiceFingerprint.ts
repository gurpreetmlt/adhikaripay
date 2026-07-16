/**
 * Browser → local Mantra / Morpho L1 RD Service (Windows).
 * Uses UIDAI HTTP API on 127.0.0.1 — same machine as the scanner.
 * Port is dynamic (often 11100–11130); last working port is cached in localStorage.
 */

const CACHE_KEY = "adhikaripay_rd_endpoint";
const PORT_START = 11100;
const PORT_END = 11135;
const PRIORITY_PORTS = [11120, 11101, 11100, 11102, 11103];
const PROBE_MS = 1500;
const CAPTURE_MS = 20000;
const BATCH = 8;

type Scheme = "http" | "https";

export interface RdEndpoint {
  port: number;
  scheme: Scheme;
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

async function fetchTimed(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function loadCache(): RdEndpoint | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as RdEndpoint;
    if (typeof p.port === "number" && (p.scheme === "http" || p.scheme === "https")) return p;
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
  } catch {
    /* ignore */
  }
}

/** Any HTTP response (incl. 405) means RD is listening. */
async function probePort(port: number, scheme: Scheme): Promise<boolean> {
  for (const path of ["/rd/info", "/"]) {
    for (const method of ["RDSERVICE", "GET"] as const) {
      try {
        await fetchTimed(`${scheme}://127.0.0.1:${port}${path}`, { method }, PROBE_MS);
        return true;
      } catch {
        /* next */
      }
    }
  }
  return false;
}

export async function discoverRdEndpoint(): Promise<RdEndpoint | null> {
  lastLog = [];

  const cached = loadCache();
  if (cached && (await probePort(cached.port, cached.scheme))) {
    lastLog.push(`Using cached ${cached.scheme}://127.0.0.1:${cached.port}`);
    return cached;
  }
  if (cached) {
    lastLog.push(`Cached port ${cached.port} dead — scanning…`);
    clearCache();
  }

  const ports = orderedPorts();
  const preferHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const schemes: Scheme[] = preferHttps ? ["https", "http"] : ["http", "https"];

  for (let i = 0; i < ports.length; i += BATCH) {
    const batch = ports.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (port) => {
        for (const scheme of schemes) {
          if (await probePort(port, scheme)) {
            lastLog.push(`Found ${scheme}://127.0.0.1:${port}`);
            return { port, scheme };
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

function pidOptionsXml(timeoutMs: number): string {
  return `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P" wadh=""/><Demo></Demo><CustOpts></CustOpts></PidOptions>`;
}

function extractErr(xml: string): string | null {
  const code = xml.match(/errCode="(-?\d+)"/);
  if (!code || code[1] === "0") return null;
  const info = xml.match(/errInfo="([^"]*)"/);
  return info?.[1] || `RD error ${code[1]}`;
}

function looksLikePid(body: string): boolean {
  return body.includes("<PidData") || body.includes("errCode=") || body.includes("<Resp");
}

async function tryCapture(
  url: string,
  method: string,
  body: string,
  ms: number,
): Promise<{ ok: true; xml: string } | { ok: false; detail: string }> {
  try {
    const res = await fetchTimed(
      url,
      {
        method,
        headers: { "Content-Type": "text/xml", Accept: "text/xml, */*" },
        body,
      },
      ms,
    );
    const text = await res.text();
    const err = extractErr(text);
    if (err) return { ok: false, detail: `${method} ${url} → ${err}` };
    if (!res.ok) return { ok: false, detail: `${method} ${url} → HTTP ${res.status}` };
    if (!text.trim() || !looksLikePid(text)) {
      return { ok: false, detail: `${method} ${url} → unexpected response` };
    }
    return { ok: true, xml: text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: `${method} ${url} → ${msg}` };
  }
}

async function captureOn(ep: RdEndpoint): Promise<string> {
  const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
  const xml = pidOptionsXml(CAPTURE_MS);
  const ms = CAPTURE_MS + 8000;
  const targets = [
    { url: `${base}/`, method: "CAPTURE" },
    { url: `${base}/`, method: "POST" },
    { url: `${base}/rd/capture`, method: "CAPTURE" },
    { url: `${base}/rd/capture`, method: "POST" },
  ];

  const errors: string[] = [];
  for (const t of targets) {
    const r = await tryCapture(t.url, t.method, xml, ms);
    if (r.ok) {
      lastLog.push(`Capture OK ${t.method} ${t.url}`);
      return r.xml;
    }
    errors.push(r.detail);
    lastLog.push(r.detail);
  }
  throw new Error(
    `Scanner did not return fingerprint data.\n` +
      `Open Mantra L1 RDService on this PC, confirm device connected, then retry.\n` +
      errors.slice(0, 4).join("\n"),
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
      `Mantra RD Service not found on this PC (ports ${PORT_START}–${PORT_END}). ` +
        `Open Mantra L1 RDService → Device connected → same Windows PC Chrome. ` +
        (onHttps
          ? "If still failing on HTTPS site, try http://localhost:3001 (local) — some browsers block local RD from live HTTPS."
          : "Confirm RD shows http://127.0.0.1:PORT on its screen."),
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
