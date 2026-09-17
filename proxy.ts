import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/logger";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/forgot-password", "/reset-password", "/track", "/privacy", "/terms", "/cookies", "/pricing", "/rate-interview", "/accept-invite", "/robots.txt", "/sitemap.xml", "/opengraph-image"]);

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path)) return NextResponse.next();
  try {
    // Navigation checks must not rotate cookies. Auth.js' auth wrapper can
    // refresh a JWT on an outstanding prefetch response after sign-out clears
    // it, restoring access. Decode read-only here; server helpers still check
    // persisted session version, membership and role on every operation.
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Auth unavailable");
    const forwardedProtocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const token = await getToken({ req, secret, secureCookie: forwardedProtocol ? forwardedProtocol === "https" : req.nextUrl.protocol === "https:" });
    if (typeof token?.id === "string" && token.id) return NextResponse.next();
  } catch (error) { logError("auth.navigation_failed", error); }
  return NextResponse.redirect(new URL("/login", req.nextUrl));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|jobs|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|woff|woff2|ttf|map)$).*)"],
};
