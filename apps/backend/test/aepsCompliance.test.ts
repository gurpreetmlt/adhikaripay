import { describe, expect, it } from "vitest";
import { haversineKm, isWithinGeofence, hashAadhaar } from "../src/modules/aeps/compliance";
import { mapInstantPayStatus } from "../src/modules/providers/instantpay/client";
import { parsePidDataXml } from "../src/modules/providers/instantpay/pidXml";

describe("haversine / geofence", () => {
  it("returns ~0 km for the same point", () => {
    expect(haversineKm(28.6139, 77.209, 28.6139, 77.209)).toBeLessThan(0.01);
  });

  it("flags a point beyond 3 km", () => {
    // ~5.5 km east of Connaught Place, Delhi
    expect(isWithinGeofence(28.6315, 77.2167, 28.6315, 77.27, 3)).toBe(false);
  });

  it("allows a point within 3 km", () => {
    expect(isWithinGeofence(28.6315, 77.2167, 28.632, 77.22, 3)).toBe(true);
  });
});

describe("hashAadhaar", () => {
  it("is stable and does not echo the raw number", () => {
    const h = hashAadhaar("123412341234");
    expect(h).toHaveLength(64);
    expect(h).not.toContain("1234");
    expect(hashAadhaar("123412341234")).toBe(h);
  });
});

describe("mapInstantPayStatus", () => {
  it("maps TXN → success, TUP → pending, else failed", () => {
    expect(mapInstantPayStatus({ statuscode: "TXN" })).toBe("success");
    expect(mapInstantPayStatus({ statuscode: "TUP" })).toBe("pending");
    expect(mapInstantPayStatus({ statuscode: "ERR" })).toBe("failed");
  });
});

describe("outletLoginStatus actcode semantics", () => {
  it("treats LOGGEDIN as ready and LOGINREQUIRED as not", () => {
    // Pure actcode mapping — mirrors instantPayOutletLoginStatus without HTTP.
    const loggedIn = (actcode: string) => actcode.toUpperCase() === "LOGGEDIN";
    expect(loggedIn("LOGGEDIN")).toBe(true);
    expect(loggedIn("LOGINREQUIRED")).toBe(false);
    expect(loggedIn("OUI")).toBe(false);
  });
});

describe("parsePidDataXml", () => {
  it("accepts a JSON biometric blob for tests", () => {
    const bio = parsePidDataXml(
      JSON.stringify({
        dc: "dc1",
        ci: "20221021",
        hmac: "h",
        dpId: "IDEMIA",
        mc: "mc",
        sessionKey: "sk",
        mi: "MSO1300",
        rdsId: "RDS",
        pidData: "pid",
        srno: "2422I013658",
        rdsVer: "1.1.5",
        fType: "2",
      }),
      "enc-aadhaar",
    );
    expect(bio.encryptedAadhaar).toBe("enc-aadhaar");
    expect(bio.dc).toBe("dc1");
    expect(bio.fType).toBe("2");
    expect(bio.srno).toBe("2422I013658");
  });

  it("parses a minimal PidData XML", () => {
    const xml = `<?xml version="1.0"?>
<PidData>
  <Resp errCode="0" errInfo="" fCount="1" fType="2" iCount="0" pCount="0" nmPoints="40" qScore="90"/>
  <DeviceInfo dpId="IDEMIA.L1" rdsId="IDEMIA.ANDROID.001" rdsVer="1.1.5" mi="MSO1300-E3" dc="device-code" mc="mc-cert"/>
  <Skey ci="20221021">session-key-b64</Skey>
  <Hmac>hmac-b64</Hmac>
  <Data type="X">pid-b64</Data>
</PidData>`;
    const bio = parsePidDataXml(xml, "enc");
    expect(bio.dpId).toBe("IDEMIA.L1");
    expect(bio.sessionKey).toBe("session-key-b64");
    expect(bio.pidData).toBe("pid-b64");
    expect(bio.fType).toBe("2");
  });
});
