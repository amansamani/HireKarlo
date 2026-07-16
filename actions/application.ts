"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { stageChangeEmail } from "@/lib/email-templates";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";

// Stage is dynamic per job now (recruiter-defined rounds), so we validate
// shape/safety rather than a fixed set of values.
const StageSchema = z.string().trim().min(1).max(60);

export async function getJobApplicantsAction(jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", applications: [] };

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      console.error(`[getJobApplicantsAction] job ${jobId} owner=${job?.userId ?? "MISSING"} but session userId=${userId} — mismatch or job not found.`);
      return { error: "Unauthorized", applications: [] };
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      include: { candidate: true },
      orderBy: { createdAt: "desc" },
    });

    const activityLogs = await prisma.activityLog.findMany({
      where: { application: { jobId } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return { job, applications, activityLogs };
  } catch (error) {
    console.error("Fetch error detail:", error);
    return { error: "Failed to fetch applicants", applications: [], activityLogs: [] };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string, jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  const parsedStage = StageSchema.safeParse(status);
  if (!parsedStage.success) return { error: "Invalid pipeline stage." };

  try {
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true, job: true }
    });

    if (!currentApp) return { error: "Application not found" };
    if (currentApp.job.userId !== userId) return { error: "Unauthorized" };

    await prisma.jobApplication.update({
      where: { id: applicationId },
      // Fixed: Bypassed type strictness for dynamic string stages
      data: { stage: parsedStage.data as any },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        applicationId,
        action: `Moved to ${status}`,
        details: `${currentApp.candidate.fullName} shifted from ${currentApp.stage} to ${status}`
      }
    });

    const { subject, html } = stageChangeEmail(currentApp.candidate.fullName, currentApp.job.title, status);
    try {
      await sendEmail(currentApp.candidate.email, subject, html);
    } catch (emailError) {
      console.error("[updateApplicationStatusAction] stage updated OK but notification email failed:", emailError);
    }

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: `Candidate moved to ${status}` };
  } catch (error) {
    console.error("Update error detail:", error);
    return { error: "Failed to update pipeline stage" };
  }
}

export async function rescoreApplicationAction(applicationId: string, jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  // Scoring silently no-ops (returns null, just a server-side console.error)
  // when misconfigured or when the AI call fails — by design, so a scoring
  // hiccup never blocks a candidate's submission. That means recruiters get
  // no signal at all when it's missing. Surface the specific reason here,
  // where a human is actually asking for it.
  if (!process.env.GEMINI_API_KEY) {
    return { error: "AI scoring isn't configured on the server (GEMINI_API_KEY is missing)." };
  }

  try {
    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true, job: true },
    });

    if (!app) return { error: "Application not found" };
    if (app.job.userId !== userId) return { error: "Unauthorized" };
    if (!app.candidate.resumeUrl) return { error: "This candidate has no resume on file to score." };

    const resumeText = await extractResumeText(app.candidate.resumeUrl);
    const score = await scoreResumeAgainstJob(resumeText, app.job.title, app.job.description ?? "");

    if (!score) {
      return { error: "Scoring failed — check the server terminal for the exact reason (AI API error, unreadable resume, etc)." };
    }

    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { matchScore: score.matchScore, aiSummary: score.summary },
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: "Resume scored.", matchScore: score.matchScore, aiSummary: score.summary };
  } catch (error) {
    console.error("[rescoreApplicationAction] failed:", error);
    return { error: "Failed to score this resume." };
  }
}