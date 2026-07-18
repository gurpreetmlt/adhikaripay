import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL, clearAuthCookies, getAuthCookies, setAuthCookies } from "@/lib/serverAuth";

/**
 * Same-origin BFF proxy — the only thing browser JS talks to for authenticated calls. Reads the
 * httpOnly access-token cookie server-side, attaches it as a Bearer header when forwarding to the
 * real backend, and transparently refreshes on a 401 using the httpOnly refresh-token cookie. The
 * raw JWTs never reach client JS, so an XSS payload has nothing to steal from localStorage.
 */
async function forward(req: NextRequest, path: string[], accessToken: string | null): Promise<Response> {
  const url = `${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
  return fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
    cache: "no-store",
  });
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  const { path } = await ctx.params;
  const { accessToken, refreshToken } = await getAuthCookies();

  let upstream = await forward(req, path, accessToken);

  if (upstream.status === 401 && refreshToken && path[0] !== "auth") {
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    const refreshJson = await refreshRes.json().catch(() => null);
    if (refreshRes.ok && refreshJson?.success) {
      await setAuthCookies(refreshJson.data.accessToken, refreshJson.data.refreshToken);
      upstream = await forward(req, path, refreshJson.data.accessToken);
    } else {
      await clearAuthCookies();
    }
  }

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
