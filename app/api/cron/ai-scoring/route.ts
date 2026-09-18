import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAiScoringJob } from "@/lib/ai-scoring-jobs";
import { logError } from "@/lib/logger";

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ enabled: false, checked: 0 });
  try {
    const now = new Date();
    await prisma.aiScoringJob.updateMany({ where: { attempts: { gte: 3 }, completedAt: null, failedAt: null, leaseUntil: { lt: now } }, data: { failedAt: now, leaseUntil: null, leaseToken: null, lastErrorCode: "LEASE_EXPIRED" } });
    const jobs = await prisma.aiScoringJob.findMany({ where: { completedAt: null, failedAt: null, attempts: { lt: 3 }, availableAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, orderBy: { availableAt: "asc" }, take: 2, select: { applicationId: true } });
    const results = await Promise.all(jobs.map(job => processAiScoringJob(job.applicationId)));
    const completed = results.filter(Boolean).length;
    return NextResponse.json({ enabled: true, checked: jobs.length, completed });
  } catch (error) { logError("ai.cron_failed", error); return NextResponse.json({ error: "Processing unavailable" }, { status: 503 }); }
}
