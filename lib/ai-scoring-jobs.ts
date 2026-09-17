import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";
import { reserveAiScore } from "@/lib/entitlements";
import { logError } from "@/lib/logger";

export async function queueAiScore(tx: Pick<Prisma.TransactionClient, "aiScoringJob">, applicationId: string) {
  const now = new Date();
  const job = await tx.aiScoringJob.findUnique({ where: { applicationId } });
  if (job && !job.completedAt && !job.failedAt && (!job.leaseUntil || job.leaseUntil > now)) return false;
  await tx.aiScoringJob.upsert({ where: { applicationId }, create: { applicationId }, update: { attempts: 0, availableAt: now, leaseUntil: null, leaseToken: null, completedAt: null, failedAt: null, lastErrorCode: null } });
  return true;
}

export function dispatchAiScore(applicationId: string) {
  if (!process.env.GEMINI_API_KEY) return;
  try { after(async () => { try { await processAiScoringJob(applicationId); } catch (error) { logError("ai.dispatch_failed", error); } }); }
  catch (error) { logError("ai.schedule_failed", error); }
}

export async function processAiScoringJob(applicationId: string) {
  if (!process.env.GEMINI_API_KEY) return false;
  const now = new Date(), leaseToken = randomUUID();
  const claim = await prisma.aiScoringJob.updateMany({ where: { applicationId, completedAt: null, failedAt: null, attempts: { lt: 3 }, availableAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { attempts: { increment: 1 }, leaseToken, leaseUntil: new Date(now.getTime() + 120_000) } });
  if (claim.count !== 1) return false;
  let errorCode = "PROCESSING_FAILED";
  try {
    const app = await prisma.jobApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { resumeUrl: true, candidate: { select: { resumeUrl: true } }, job: { select: { organizationId: true, title: true, description: true } } } });
    const resumeUrl = app.resumeUrl || app.candidate.resumeUrl;
    if (!resumeUrl) { errorCode = "NO_RESUME"; throw new Error(errorCode); }
    const text = await extractResumeText(resumeUrl);
    if (!text.trim()) { errorCode = "NO_TEXT"; throw new Error(errorCode); }
    errorCode = "ALLOWANCE_UNAVAILABLE";
    if (!(await reserveAiScore(app.job.organizationId))) throw new Error(errorCode);
    errorCode = "PROVIDER_UNAVAILABLE";
    const score = await scoreResumeAgainstJob(text, app.job.title, app.job.description);
    if (!score) throw new Error(errorCode);
    return await prisma.$transaction(async tx => {
      const owned = await tx.aiScoringJob.updateMany({ where: { applicationId, leaseToken }, data: { completedAt: new Date(), leaseUntil: null, leaseToken: null, lastErrorCode: null } });
      if (owned.count !== 1) return false;
      await tx.jobApplication.update({ where: { id: applicationId }, data: { matchScore: score.matchScore, aiSummary: score.summary } });
      return true;
    });
  } catch (error) {
    logError("ai.processing_failed", error);
    const owned = await prisma.aiScoringJob.findFirst({ where: { applicationId, leaseToken }, select: { attempts: true } });
    if (owned) await prisma.aiScoringJob.updateMany({ where: { applicationId, leaseToken }, data: { leaseUntil: null, leaseToken: null, lastErrorCode: errorCode, availableAt: new Date(Date.now() + 60_000 * 2 ** owned.attempts), ...(["NO_RESUME", "NO_TEXT", "ALLOWANCE_UNAVAILABLE"].includes(errorCode) || owned.attempts >= 3 ? { failedAt: new Date() } : {}) } });
    return false;
  }
}
