import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpayCredentials } from "@/lib/razorpay";
import { syncRazorpayAgreement } from "@/lib/razorpay-sync";
import { logError } from "@/lib/logger";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  if (!process.env.RAZORPAY_KEY_ID) return NextResponse.json({ checked: 0 });
  try {
    const agreements = await prisma.razorpayAgreement.findMany({ where: { keyId: razorpayCredentials().keyId, nextSyncAt: { lte: new Date() }, status: { not: "rejected" }, creationAttemptedAt: { not: null } }, orderBy: { nextSyncAt: "asc" }, take: 2 });
    const results = await Promise.all(agreements.map(async agreement => {
      const claimed = await prisma.razorpayAgreement.updateMany({ where: { id: agreement.id, nextSyncAt: agreement.nextSyncAt }, data: { nextSyncAt: new Date(Date.now() + 5 * 60_000) } });
      if (!claimed.count) return true;
      try { await syncRazorpayAgreement(agreement.id); return true; }
      catch (error) { logError("billing.reconciliation_failed", error); return false; }
    }));
    return NextResponse.json({ checked: agreements.length, failed: results.filter(x => !x).length }, { status: results.every(Boolean) ? 200 : 503 });
  } catch (error) { logError("billing.reconciliation_unavailable", error); return new NextResponse("Unavailable", { status: 503 }); }
}
