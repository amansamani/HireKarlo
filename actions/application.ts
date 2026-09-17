"use server";

import { reserveAiScore } from "@/lib/entitlements";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { stageChangeEmail } from "@/lib/email-templates";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";

const StageSchema = z.string().trim().min(1).max(60);

export async function getJobApplicantsAction(jobId: string) {
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

    const [applications, activityLogs] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { jobId },
        select: {
          id: true, stage: true, createdAt: true, matchScore: true, aiSummary: true, resumeUrl: true,
          candidate: { select: { id: true, fullName: true, email: true, resumeUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findMany({
        where: { application: { jobId } },
        select: { id: true, action: true, details: true, createdAt: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const safeApplications = applications.map(a => ({ ...a, resumeUrl: undefined, candidate: { ...a.candidate, resumeUrl: (a.resumeUrl || a.candidate.resumeUrl) ? `/api/application-resumes/${a.id}` : null } }));
    return { job, applications: safeApplications, activityLogs, canEditPipeline: canEditPipeline(ctx.role) };
  } catch (error) {
    console.error("[getJobApplicantsAction] Fetch error:", error);
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
      select: { stage: true, candidate: { select: { fullName: true, email: true } }, job: { select: { organizationId: true, title: true, interviewRounds: true } } },
    });

    if (!currentApp) return { error: "Application not found" };
    if (currentApp.job.organizationId !== ctx.organizationId) return { error: "Unauthorized" };

    const allowedStages = ["APPLIED", "SCREENING", "TECHNICAL", "HR", "OFFER", "REJECTED", "HIRED", ...(currentApp.job.interviewRounds.length ? currentApp.job.interviewRounds : ["Interview"])];
    if (!allowedStages.includes(parsedStage.data)) return { error: "Unknown pipeline stage." };
    await prisma.$transaction([
      prisma.jobApplication.update({ where: { id: applicationId }, data: { stage: parsedStage.data } }),
      prisma.activityLog.create({
        data: {
          userId: ctx.userId,
          applicationId,
          action: `Moved to ${status}`,
          details: `${currentApp.candidate.fullName} shifted from ${currentApp.stage} to ${status}`,
        },
      }),
    ]);

    const { subject, html } = stageChangeEmail(currentApp.candidate.fullName, currentApp.job.title, status);
    await sendEmail(currentApp.candidate.email, subject, html).catch((emailError) => {
      console.error("[updateApplicationStatusAction] Email notification failed:", emailError);
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    revalidatePath("/dashboard");
    return { success: `Candidate moved to ${status}` };
  } catch (error) {
    console.error("[updateApplicationStatusAction] Update error:", error);
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

    const resumeText = await extractResumeText(resumeUrl);
    if (!resumeText.trim()) return { error: "This resume has no readable text." };
    if (!(await reserveAiScore(ctx.organizationId))) return { error: "AI allowance used. Visit Billing." };
    const score = await scoreResumeAgainstJob(resumeText, app.job.title, app.job.description ?? "");

    if (!score) return { error: "Scoring failed — check the server terminal for the exact reason (AI API error, unreadable resume, etc)." };

    await prisma.jobApplication.update({ where: { id: applicationId }, data: { matchScore: score.matchScore, aiSummary: score.summary } });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: "Resume scored.", matchScore: score.matchScore, aiSummary: score.summary };
  } catch (error) {
    console.error("[rescoreApplicationAction] Failed:", error);
    return { error: "Failed to score this resume." };
  }
}
