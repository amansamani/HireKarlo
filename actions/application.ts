"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { stageChangeEmail } from "@/lib/email-templates";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";
import { ApplicationStage } from "@prisma/client";
const StageSchema = z.string().trim().min(1).max(60);

export async function getJobApplicantsAction(jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", applications: [], activityLogs: [] };

  try {
    // 1. Optimize: Only select necessary fields to verify ownership and build UI
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, userId: true, title: true, interviewRounds: true },
    });

    if (!job || job.userId !== userId) {
      return { error: "Unauthorized or job not found", applications: [], activityLogs: [] };
    }

    // 2. Optimize: Fetch applications and logs concurrently using Promise.all
    const [applications, activityLogs] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { jobId },
        select: {
          id: true,
          stage: true,
          createdAt: true,
          matchScore: true,
          aiSummary: true,
          candidate: {
            select: {
              fullName: true,
              email: true,
              resumeUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findMany({
        where: { application: { jobId } },
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50, // Prevent memory bloat on jobs with hundreds of historical movements
      }),
    ]);

    return { job, applications, activityLogs };
  } catch (error) {
    console.error("[getJobApplicantsAction] Fetch error:", error);
    return { error: "Failed to fetch applicants", applications: [], activityLogs: [] };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string, jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  const parsedStage = StageSchema.safeParse(status);
  if (!parsedStage.success) return { error: "Invalid pipeline stage." };

  try {
    // 3. Optimize: Select only what's needed for the update and email
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        stage: true,
        candidate: { select: { fullName: true, email: true } },
        job: { select: { userId: true, title: true } },
      },
    });

    if (!currentApp) return { error: "Application not found" };
    if (currentApp.job.userId !== userId) return { error: "Unauthorized" };

    await prisma.$transaction([
      prisma.jobApplication.update({
        where: { id: applicationId },
        data: { stage: parsedStage.data as ApplicationStage },
      }),
      prisma.activityLog.create({
        data: {
          userId,
          applicationId,
          action: `Moved to ${status}`,
          details: `${currentApp.candidate.fullName} shifted from ${currentApp.stage} to ${status}`,
        },
      }),
    ]);

    // 5. Optimize: Fire-and-forget email to avoid blocking the HTTP response
    const { subject, html } = stageChangeEmail(
      currentApp.candidate.fullName,
      currentApp.job.title,
      status
    );

    sendEmail(currentApp.candidate.email, subject, html).catch((emailError) => {
      console.error("[updateApplicationStatusAction] Email notification failed:", emailError);
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: `Candidate moved to ${status}` };
  } catch (error) {
    console.error("[updateApplicationStatusAction] Update error:", error);
    return { error: "Failed to update pipeline stage" };
  }
}

export async function rescoreApplicationAction(applicationId: string, jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  if (!process.env.GEMINI_API_KEY) {
    return { error: "AI scoring isn't configured on the server (GEMINI_API_KEY is missing)." };
  }

  try {
    // 6. Optimize: Selective fetching to save memory before heavy AI processing
    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        candidate: { select: { fullName: true, resumeUrl: true } },
        job: { select: { userId: true, title: true, description: true } },
      },
    });

    if (!app) return { error: "Application not found" };
    if (app.job.userId !== userId) return { error: "Unauthorized" };
    if (!app.candidate.resumeUrl) return { error: "This candidate has no resume on file to score." };

    const resumeText = await extractResumeText(app.candidate.resumeUrl);
    const score = await scoreResumeAgainstJob(
      resumeText,
      app.job.title,
      app.job.description ?? ""
    );

    if (!score) {
      return { error: "Scoring failed — check the server terminal for the exact reason (AI API error, unreadable resume, etc)." };
    }

    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        matchScore: score.matchScore,
        aiSummary: score.summary,
      },
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: "Resume scored.", matchScore: score.matchScore, aiSummary: score.summary };
  } catch (error) {
    console.error("[rescoreApplicationAction] Failed:", error);
    return { error: "Failed to score this resume." };
  }
}