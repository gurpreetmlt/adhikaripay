/**
 * Browser → local Mantra L1 RD Service (Windows).
 * Fast path: cached port → one CAPTURE. Slow full scan only on cache miss.
 */

const CACHE_KEY = "adhikaripay_rd_endpoint_v3";
const PORT_START = 11100;
const PORT_END = 11120;
const PRIORITY_PORTS = [11100, 11101, 11102, 11120, 11103];
const PROBE_MS = 600;
const CAPTURE_MS = 20000;
const QUICK_FAIL_MS = 1200;
const BATCH = 10;

type Scheme = "http" | "https";

export interface RdEndpoint {
  port: number;
  scheme: Scheme;
  capturePath: string;
}

let lastLog: string[] = [];
/** In-memory for same page session — skip localStorage + probe */
let sessionEp: RdEndpoint | null = null;

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
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Timeout"));
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
  sessionEp = ep;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(ep));
  } catch {
    /* ignore */
  }
}

function clearCache() {
  sessionEp = null;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem("adhikaripay_rd_endpoint_v2");
    localStorage.removeItem("adhikaripay_rd_endpoint");
  } catch {
    /* ignore */
  }
}

/** Single cheap probe — alive if any response. */
async function isAlive(port: number, scheme: Scheme): Promise<boolean> {
  const url = `${scheme}://127.0.0.1:${port}/`;
  try {
    await xhrRequest("RDSERVICE", url, null, PROBE_MS);
    return true;
  } catch {
    try {
      await xhrRequest("GET", url, null, PROBE_MS);
      return true;
    } catch {
      return false;
    }
  }
}

async function discoverRdEndpoint(force = false): Promise<RdEndpoint | null> {
  lastLog = [];

  if (!force && sessionEp) {
    lastLog.push(`session ${sessionEp.scheme}://127.0.0.1:${sessionEp.port}`);
    return sessionEp;
  }

  const preferHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const schemes: Scheme[] = preferHttps ? ["https", "http"] : ["http", "https"];

  const cached = loadCache();
  if (!force && cached) {
    // Trust cache for speed — only verify with one quick probe
    if (await isAlive(cached.port, cached.scheme)) {
      lastLog.push(`cached ${cached.scheme}://127.0.0.1:${cached.port}`);
      sessionEp = cached;
      return cached;
    }
    // Try other scheme same port (common: http vs https)
    for (const scheme of schemes) {
      if (scheme === cached.scheme) continue;
      if (await isAlive(cached.port, scheme)) {
        const ep = { ...cached, scheme };
        saveCache(ep);
        lastLog.push(`cached-port ${scheme}://127.0.0.1:${cached.port}`);
        return ep;
      }
    }
    clearCache();
  }

  const ports = orderedPorts();
  for (let i = 0; i < ports.length; i += BATCH) {
    const batch = ports.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.flatMap((port) =>
        schemes.map(async (scheme) => {
          if (await isAlive(port, scheme)) {
            return {
              port,
              scheme,
              capturePath: "/rd/capture",
            } satisfies RdEndpoint;
          }
          return null;
        }),
      ),
    );
    const found = results.find((r): r is RdEndpoint => r !== null);
    if (found) {
      lastLog.push(`found ${found.scheme}://127.0.0.1:${found.port}`);
      saveCache(found);
      return found;
    }
  }
  return null;
}

function pidOptions(timeoutMs: number): string {
  // Single Mantra L1-friendly XML (avoid multi-variant loops before light-on)
  return `<PidOptions ver="1.0"><Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P"/></PidOptions>`;
}

function pidOptionsAlt(timeoutMs: number): string {
  return `<PidOptions ver="1.0"><Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P"/></PidOptions>`;
}

function extractErr(xml: string): string | null {
  const code = xml.match(/errCode="(-?\d+)"/);
  if (!code || code[1] === "0") return null;
  const info = xml.match(/errInfo="([^"]*)"/);
  return info?.[1] || `RD error ${code[1]}`;
}

function isSuccessPid(text: string): boolean {
  return text.includes("<PidData") && (text.includes('errCode="0"') || !extractErr(text));
}

async function captureOnce(
  url: string,
  body: string,
  timeoutMs: number,
): Promise<{ ok: true; xml: string } | { ok: false; detail: string; fatal?: boolean }> {
  try {
    const res = await xhrRequest("CAPTURE", url, body, timeoutMs);
    const text = res.text;
    const err = extractErr(text);
    if (err) {
      const fatal =
        /finger|timeout|not connected|device|busy|cancel/i.test(err) ||
        text.includes('errCode="700"');
      return { ok: false, detail: err, fatal };
    }
    if (isSuccessPid(text) || (text.includes("<PidData") && text.includes("<Data"))) {
      return { ok: true, xml: text };
    }
    if (text.includes("<PidData")) return { ok: true, xml: text };
    return { ok: false, detail: `Unexpected response from ${url}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: `${url}: ${msg}` };
  }
}

async function captureOn(ep: RdEndpoint): Promise<string> {
  const base = `${ep.scheme}://127.0.0.1:${ep.port}`;
  const opts = pidOptions(CAPTURE_MS);

  // 1) Best path first — full timeout (this is when red light should turn on)
  const primary = `${base}${ep.capturePath || "/rd/capture"}`;
  lastLog.push(`CAPTURE ${primary}`);
  let r = await captureOnce(primary, opts, CAPTURE_MS + 3000);
  if (r.ok) {
    saveCache(ep);
    return r.xml;
  }
  if (r.fatal) throw new Error(r.detail);
  lastLog.push(r.detail);

  // 2) Quick fallbacks only (short timeout — don't wait 20s each)
  const fallbacks = [`${base}/`, `${base}/rd/capture`, `${base}/capture`].filter(
    (u) => u !== primary,
  );
  for (const url of fallbacks) {
    lastLog.push(`quick CAPTURE ${url}`);
    r = await captureOnce(url, opts, QUICK_FAIL_MS);
    if (r.ok) {
      const path = url.slice(base.length) || "/";
      saveCache({ ...ep, capturePath: path });
      return r.xml;
    }
    if (r.fatal) throw new Error(r.detail);
    // If quick timeout but might be waiting for finger — retry once with full timeout
    if (r.detail.includes("Timeout") && url === `${base}/`) {
      lastLog.push(`full CAPTURE ${url}`);
      r = await captureOnce(url, opts, CAPTURE_MS + 3000);
      if (r.ok) {
        saveCache({ ...ep, capturePath: "/" });
        return r.xml;
      }
      if (r.fatal || r.detail) throw new Error(r.ok ? "" : r.detail);
    }
  }

  // 3) Alt PidOptions only if RD said invalid options
  const needAlt = lastLog.some((l) => /invalid|100/i.test(l));
  if (needAlt) {
    const alt = pidOptionsAlt(CAPTURE_MS);
    r = await captureOnce(primary, alt, CAPTURE_MS + 3000);
    if (r.ok) return r.xml;
    if (r.detail) throw new Error(r.detail);
  }

  throw new Error(r.detail || "Scanner did not return fingerprint data");
}

export function getRdProbeLog(): string {
  return lastLog.length ? lastLog.join("\n") : "(no probe yet)";
}

export async function captureFingerprintWeb(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Fingerprint capture only works in the browser");
  }

  const ep = await discoverRdEndpoint(false);
  if (!ep) {
    throw new Error(
      `Mantra RD not found (ports ${PORT_START}–${PORT_END}). Open Mantra L1 RDService on this PC.`,
    );
  }

  try {
    return await captureOn(ep);
  } catch (first) {
    // One rescan if cache was stale
    clearCache();
    const ep2 = await discoverRdEndpoint(true);
    if (!ep2) throw first;
    return await captureOn(ep2);
  }
}
