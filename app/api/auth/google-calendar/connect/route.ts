import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/require-auth";
import { canManageTeam } from "@/lib/roles";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ctx = await requireOrg();

  if (!ctx || !canManageTeam(ctx.role)) {
    return NextResponse.redirect(new URL("/dashboard/team?googleError=unauthorized", baseUrl));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 min — plenty for the consent screen round trip
    path: "/",
  });
  return response;
}