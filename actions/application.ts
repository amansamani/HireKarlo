"use server";
import { logError } from "@/lib/logger";

import { queueAiScore, dispatchAiScore } from "@/lib/ai-scoring-jobs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { enqueueEmail, dispatchQueuedEmail } from "@/lib/send-email";
import { stageChangeEmail } from "@/lib/email-templates";
import { lockOrganization } from "@/lib/entitlements";

const StageSchema = z.string().trim().min(1).max(60);

export async function getJobApplicantsAction(jobId: string, requestedPage = 1) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) return { error: "Unauthorized", applications: [], activityLogs: [] };

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, organizationId: true, title: true, department: true, location: true, type: true, status: true, interviewRounds: true },
    });

    if (!job || job.organizationId !== ctx.organizationId) {
      return { error: "Unauthorized or job not found", applications: [], activityLogs: [] };
    }

    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10000) : 1;
    const [applications, activityLogs] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { jobId },
        select: {
          id: true, stage: true, createdAt: true, matchScore: true, aiSummary: true, resumeUrl: true,
          aiScoringJob: { select: { completedAt: true, failedAt: true } },
          candidate: { select: { id: true, fullName: true, email: true, resumeUrl: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 100, take: 101,
      }),
      prisma.activityLog.findMany({
        where: { application: { jobId } },
        select: { id: true, action: true, details: true, createdAt: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const safeApplications = applications.slice(0,100).map(a => ({ ...a, resumeUrl: undefined, scoringStatus: a.aiScoringJob ? a.aiScoringJob.completedAt ? "COMPLETE" : a.aiScoringJob.failedAt ? "FAILED" : "PENDING" : "NONE", candidate: { ...a.candidate, resumeUrl: (a.resumeUrl || a.candidate.resumeUrl) ? `/api/application-resumes/${a.id}` : null } }));
    return { job, hasMore: applications.length > 100, page, applications: safeApplications, activityLogs, canEditPipeline: canEditPipeline(ctx.role) };
  } catch (error) {
    logError("actions.application", error);
    return { error: "Failed to fetch applicants", applications: [], activityLogs: [] };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string, jobId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't move candidates between stages." };

  const parsedStage = StageSchema.safeParse(status);
  if (!parsedStage.success) return { error: "Invalid pipeline stage." };

  try {
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { stage: true, jobId: true, candidate: { select: { fullName: true, email: true } }, job: { select: { organizationId: true, title: true, interviewRounds: true } } },
    });

    if (!currentApp) return { error: "Application not found" };
    if (currentApp.job.organizationId !== ctx.organizationId || currentApp.jobId !== jobId) return { error: "Unauthorized" };

    const allowedStages = ["APPLIED", "SCREENING", "TECHNICAL", "HR", "OFFER", "REJECTED", "HIRED", ...(currentApp.job.interviewRounds.length ? currentApp.job.interviewRounds : ["Interview"])];
    if (!allowedStages.includes(parsedStage.data)) return { error: "Unknown pipeline stage." };
    const { subject, html } = stageChangeEmail(currentApp.candidate.fullName, currentApp.job.title, parsedStage.data);
    const queuedId = await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      const fresh = await tx.jobApplication.findUniqueOrThrow({where:{id:applicationId},select:{stage:true}});
      if (fresh.stage === parsedStage.data) return null;
      await tx.jobApplication.update({ where: { id: applicationId }, data: { stage: parsedStage.data } });
      await tx.activityLog.create({
        data: {
          userId: ctx.userId,
          applicationId,
          action: `Moved to ${status}`,
          details: `${currentApp.candidate.fullName} shifted from ${fresh.stage} to ${parsedStage.data}`,
        },
      });
      return enqueueEmail(tx, currentApp.candidate.email, subject, html);
    });
    if (queuedId) dispatchQueuedEmail(queuedId);

    revalidatePath(`/dashboard/jobs/${jobId}`);
    revalidatePath("/dashboard");
    return { success: `Candidate moved to ${status}` };
  } catch (error) {
    logError("actions.application", error);
    return { error: "Failed to update pipeline stage" };
  }
}

export async function rescoreApplicationAction(applicationId: string, jobId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Unauthorized" };
  if (!process.env.GEMINI_API_KEY) return { error: "AI scoring isn't configured on the server (GEMINI_API_KEY is missing)." };

  try {
    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { resumeUrl: true, candidate: { select: { fullName: true, resumeUrl: true } }, job: { select: { organizationId: true, title: true, description: true } } },
    });

    if (!app) return { error: "Application not found" };
    if (app.job.organizationId !== ctx.organizationId) return { error: "Unauthorized" };
    const resumeUrl = app.resumeUrl || app.candidate.resumeUrl;
    if (!resumeUrl) return { error: "This candidate has no resume on file to score." };

    const queued = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${applicationId} FOR UPDATE`;
      return queueAiScore(tx, applicationId);
    });
    if (queued) dispatchAiScore(applicationId);
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: queued ? "Resume queued for AI review. Refresh after processing." : "This resume is already queued for AI review." };
  } catch (error) {
    logError("actions.application", error);
    return { error: "Failed to score this resume." };
  }
}
