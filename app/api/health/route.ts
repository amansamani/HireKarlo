import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { missingRequiredEnvironment } from "@/lib/readiness";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (missingRequiredEnvironment().length) throw new Error("Configuration incomplete");
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError("health.unavailable", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
