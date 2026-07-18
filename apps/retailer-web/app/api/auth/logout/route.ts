import { NextResponse } from "next/server";
import { BACKEND_URL, clearAuthCookies, getAuthCookies } from "@/lib/serverAuth";

export async function POST() {
  const { refreshToken } = await getAuthCookies();
  if (refreshToken) {
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => {});
  }
  await clearAuthCookies();
  return NextResponse.json({ success: true, data: null, message: "Logged out" });
}
