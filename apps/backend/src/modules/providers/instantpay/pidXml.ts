/**
 * Parse UIDAI RD-service PidData XML into InstantPay biometricData fields.
 * Accepts either a full <PidData>...</PidData> document or a JSON string of
 * already-normalized fields (for future clients).
 */

export interface InstantPayBiometricData {
  encryptedAadhaar: string;
  dc: string;
  ci: string;
  hmac: string;
  dpId: string;
  mc: string;
  pidDataType: string;
  sessionKey: string;
  mi: string;
  rdsId: string;
  errCode: string;
  errInfo: string;
  fCount: string;
  fType: string;
  iCount: string | number;
  iType: string;
  pCount: string | number;
  pType: string;
  srno: string;
  sysid: string;
  ts: string;
  pidData: string;
  qScore: string;
  nmPoints: string;
  rdsVer: string;
}

function attr(tag: string, name: string, xml: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m?.[1] ?? "";
}

function textContent(tag: string, xml: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return (m?.[1] ?? "").trim();
}

function selfOrText(tag: string, xml: string): string {
  const t = textContent(tag, xml);
  if (t) return t;
  // Some RD services emit empty self-closing tags with value in an attribute.
  return attr(tag, "value", xml);
}

/**
 * Extract InstantPay biometric fields from RD PidData XML.
 * `encryptedAadhaar` is supplied separately (AES-CBC of the 12-digit number).
 */
export function parsePidDataXml(pidXml: string, encryptedAadhaar: string): InstantPayBiometricData {
  const xml = pidXml.trim();
  if (!xml.includes("<PidData") && !xml.includes("<PidData ")) {
    // Allow pre-built JSON biometric blob for integration tests.
    if (xml.startsWith("{")) {
      const parsed = JSON.parse(xml) as Partial<InstantPayBiometricData>;
      return {
        encryptedAadhaar: parsed.encryptedAadhaar ?? encryptedAadhaar,
        dc: parsed.dc ?? "",
        ci: parsed.ci ?? "",
        hmac: parsed.hmac ?? "",
        dpId: parsed.dpId ?? "",
        mc: parsed.mc ?? "",
        pidDataType: parsed.pidDataType ?? "X",
        sessionKey: parsed.sessionKey ?? "",
        mi: parsed.mi ?? "",
        rdsId: parsed.rdsId ?? "",
        errCode: parsed.errCode ?? "0",
        errInfo: parsed.errInfo ?? "",
        fCount: String(parsed.fCount ?? "1"),
        fType: String(parsed.fType ?? "2"),
        iCount: parsed.iCount ?? 0,
        iType: String(parsed.iType ?? ""),
        pCount: parsed.pCount ?? 0,
        pType: String(parsed.pType ?? ""),
        srno: parsed.srno ?? "",
        sysid: parsed.sysid ?? "",
        ts: parsed.ts ?? "",
        pidData: parsed.pidData ?? "",
        qScore: String(parsed.qScore ?? "0"),
        nmPoints: String(parsed.nmPoints ?? "0"),
        rdsVer: parsed.rdsVer ?? "",
      };
    }
    throw new Error("biometricPayload is not a PidData XML document");
  }

  const deviceInfo = xml.match(/<DeviceInfo\b[^>]*>/i)?.[0] ?? "";
  const skey = xml.match(/<Skey\b[^>]*>[\s\S]*?<\/Skey>/i)?.[0] ?? xml.match(/<Skey\b[^>]*\/>/i)?.[0] ?? "";
  const hmacTag = xml.match(/<Hmac\b[^>]*>[\s\S]*?<\/Hmac>/i)?.[0] ?? "";
  const dataTag = xml.match(/<Data\b[^>]*>[\s\S]*?<\/Data>/i)?.[0] ?? "";

  return {
    encryptedAadhaar,
    dc: attr("DeviceInfo", "dc", deviceInfo) || attr("DeviceInfo", "dc", xml),
    ci: attr("Skey", "ci", skey) || attr("Skey", "ci", xml),
    hmac: textContent("Hmac", hmacTag || xml),
    dpId: attr("DeviceInfo", "dpId", deviceInfo) || attr("DeviceInfo", "dpId", xml),
    mc: attr("DeviceInfo", "mc", deviceInfo) || attr("DeviceInfo", "mc", xml),
    pidDataType: attr("Data", "type", dataTag || xml) || "X",
    sessionKey: textContent("Skey", skey || xml),
    mi: attr("DeviceInfo", "mi", deviceInfo) || attr("DeviceInfo", "mi", xml),
    rdsId: attr("DeviceInfo", "rdsId", deviceInfo) || attr("DeviceInfo", "rdsId", xml),
    errCode: attr("Resp", "errCode", xml) || "0",
    errInfo: attr("Resp", "errInfo", xml),
    fCount: attr("Resp", "fCount", xml) || "1",
    fType: attr("Resp", "fType", xml) || "2",
    iCount: attr("Resp", "iCount", xml) || 0,
    iType: attr("Resp", "iType", xml) || "",
    pCount: attr("Resp", "pCount", xml) || 0,
    pType: attr("Resp", "pType", xml) || "",
    srno:
      (() => {
        const m =
          xml.match(/name="srno"[^>]*value="([^"]*)"/i) || xml.match(/value="([^"]*)"[^>]*name="srno"/i);
        return m?.[1] ?? attr("DeviceInfo", "srno", xml);
      })(),
    sysid:
      (() => {
        const m =
          xml.match(/name="sysid"[^>]*value="([^"]*)"/i) || xml.match(/value="([^"]*)"[^>]*name="sysid"/i);
        return m?.[1] ?? "";
      })(),
    ts: attr("Resp", "ts", xml) || attr("Pid", "ts", xml),
    pidData: selfOrText("Data", dataTag || xml),
    qScore: attr("Resp", "qScore", xml) || "0",
    nmPoints: attr("Resp", "nmPoints", xml) || "0",
    rdsVer: attr("DeviceInfo", "rdsVer", deviceInfo) || attr("DeviceInfo", "rdsVer", xml),
  };
}
