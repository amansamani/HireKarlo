import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { missingRequiredEnvironment } from "@/lib/readiness";
import { billingConfigured } from "@/lib/billing-config";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const before = new Date(Date.now() - 15 * 60_000);
    const staleBilling = new Date(Date.now() - 45 * 60_000);
    const [emailBacklog, emailFailed, aiBacklog, aiFailed, billingBacklog] = await Promise.all([
      prisma.emailOutbox.count({ where: { sentAt: null, failedAt: null, createdAt: { lt: before } } }),
      prisma.emailOutbox.count({ where: { failedAt: { not: null } } }),
      prisma.aiScoringJob.count({ where: { completedAt: null, failedAt: null, createdAt: { lt: before } } }),
      prisma.aiScoringJob.count({ where: { failedAt: { not: null } } }),
      prisma.razorpayAgreement.count({ where: { keyId: process.env.RAZORPAY_KEY_ID || "unconfigured", status: { not: "rejected" }, creationAttemptedAt: { not: null }, OR: [
        { nextSyncAt: { lt: before } },
        { status: { notIn: ["cancelled", "completed", "expired"] }, OR: [{ lastSyncedAt: { lt: staleBilling } }, { lastSyncedAt: null, createdAt: { lt: staleBilling } }] },
      ] } }),
    ]);
    const configured = (names: string[]) => names.every(name => !!process.env[name]?.trim());
    const configuration = { core: missingRequiredEnvironment().length === 0, email: configured(["EMAIL_USER", "EMAIL_PASS"]), resumes: configured(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]), ai: configured(["GEMINI_API_KEY"]), billing: billingConfigured(), calendar: configured(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_TOKEN_ENCRYPTION_KEY"]) };
    const healthy = configuration.core && configuration.email && configuration.resumes && emailBacklog === 0 && aiBacklog === 0 && billingBacklog === 0;
    return NextResponse.json({ status: healthy ? "ok" : "degraded", configuration, queues: { emailBacklog, emailFailed, aiBacklog, aiFailed, billingBacklog } }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ status: "unavailable" }, { status: 503 }); }
}
