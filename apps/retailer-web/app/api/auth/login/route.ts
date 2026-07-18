import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, setAuthCookies } from "@/lib/serverAuth";

// Calls the real backend's bearer-token login, then strips the tokens out of the response body
// before it reaches the browser — they're set as httpOnly cookies instead.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/auth/login`, {
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
  return NextResponse.json(json ?? { success: false, message: "Login failed" }, { status: upstream.status });
}
