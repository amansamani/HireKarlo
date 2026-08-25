import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canManageTeam } from "@/lib/roles";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google-calendar";
import { encryptSecret } from "@/lib/encrypted-secret";

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const teamUrl = new URL("/dashboard/team", baseUrl);

  function redirectTo(url: URL) {
    const response = NextResponse.redirect(url);
    response.cookies.delete("google_oauth_state");
    return response;
  }

  const ctx = await requireOrg();
  if (!ctx || !canManageTeam(ctx.role)) {
    teamUrl.searchParams.set("googleError", "unauthorized");
    return redirectTo(teamUrl);
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const returnedState = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get("google_oauth_state")?.value;

  if (error || !code) {
    teamUrl.searchParams.set("googleError", "denied");
    return redirectTo(teamUrl);
  }
  if (!expectedState || returnedState !== expectedState) {
    teamUrl.searchParams.set("googleError", "state_mismatch");
    return redirectTo(teamUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Google only issues a refresh_token on the FIRST consent for an app.
      // If this org already granted access before and is reconnecting,
      // Google skips it — they need to revoke access at
      // myaccount.google.com/permissions first, then reconnect.
      teamUrl.searchParams.set("googleError", "no_refresh_token");
      return redirectTo(teamUrl);
    }

    const email = await getGoogleUserEmail(tokens.access_token);

    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { googleRefreshToken: encryptSecret(tokens.refresh_token), googleCalendarEmail: email },
    });

    teamUrl.searchParams.set("googleConnected", "1");
    return redirectTo(teamUrl);
  } catch (err) {
    console.error("[google-calendar-callback] failed:", err);
    teamUrl.searchParams.set("googleError", "failed");
    return redirectTo(teamUrl);
  }
}