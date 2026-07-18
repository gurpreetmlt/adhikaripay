import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, setAuthCookies } from "@/lib/serverAuth";

// Same pattern as /api/auth/login — proxies to backend /auth/otp/verify, sets httpOnly cookies,
// strips tokens from the JSON the browser sees.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const json = await upstream.json().catch(() => null);

  if (upstream.ok && json?.success) {
    await setAuthCookies(json.data.accessToken, json.data.refreshToken);
    return NextResponse.json({ success: true, data: { user: json.data.user }, message: json.message });
  }
  return NextResponse.json(json ?? { success: false, message: "OTP verification failed" }, { status: upstream.status });
}
