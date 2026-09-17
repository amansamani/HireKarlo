import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/application-otp";
import { logError } from "@/lib/logger";
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token"), email = normalizeEmail(req.nextUrl.searchParams.get("email") || "");
  const loginUrl = new URL("/login", req.url);
  if (!token || !email || token.length > 200 || email.length > 254) { loginUrl.searchParams.set("verify_error", "missing_params"); return NextResponse.redirect(loginUrl); }
  try {
    const verified = await prisma.$transaction(async tx => {
      const claimed = await tx.verificationToken.deleteMany({ where: { identifier: email, token, expires: { gt: new Date() } } });
      if (claimed.count !== 1) return false;
      await tx.user.update({ where: { email }, data: { emailVerified: new Date() } }); return true;
    });
    loginUrl.searchParams.set(verified ? "verified" : "verify_error", verified ? "1" : "invalid_token");
  } catch (error) { logError("auth.verification_failed", error); loginUrl.searchParams.set("verify_error", "server_error"); }
  return NextResponse.redirect(loginUrl);
}
