"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { interviewScheduledEmail } from "@/lib/email-templates";
import { generateInterviewICS } from "@/lib/generate-ics";

export async function scheduleInterviewAction(data: {
  applicationId: string;
  round: string;
  interviewer: string;
  scheduledAt: string;
  jobId: string;
  durationMinutes?: number;
}) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  const duration = data.durationMinutes ?? 60;
  const start = new Date(data.scheduledAt);
  const end = new Date(start.getTime() + duration * 60_000);

  try {
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: data.applicationId },
      select: {
        candidate: { select: { fullName: true, email: true } },
        job: { select: { userId: true, title: true } },
      },
    });

    if (!currentApp) return { error: "Application not found." };
    if (currentApp.job.userId !== userId) return { error: "Unauthorized" };

    // Double-booking guard — interviewer is free text (no interviewer accounts
    // in this schema yet), so this is a soft name-match within this recruiter's
    // own jobs, scanning a generous +/-4h window and checking real overlap in JS
    // since each interview can have its own duration.
    const scanStart = new Date(start.getTime() - 4 * 60 * 60_000);
    const scanEnd = new Date(end.getTime() + 4 * 60 * 60_000);
    const nearby = await prisma.interview.findMany({
      where: {
        interviewer: data.interviewer,
        application: { job: { userId } },
        scheduledAt: { gte: scanStart, lte: scanEnd },
      },
      select: { scheduledAt: true, durationMinutes: true, application: { select: { candidate: { select: { fullName: true } } } } },
    });
    const conflict = nearby.find((iv) => {
      const ivStart = iv.scheduledAt.getTime();
      const ivEnd = ivStart + iv.durationMinutes * 60_000;
      return ivStart < end.getTime() && ivEnd > start.getTime();
    });
    if (conflict) {
      return { error: `${data.interviewer} already has an interview with ${conflict.application.candidate.fullName} that overlaps this time.` };
    }

    await prisma.$transaction([
      prisma.interview.create({
        data: {
          applicationId: data.applicationId,
          round: data.round,
          interviewer: data.interviewer,
          scheduledAt: start,
          durationMinutes: duration,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId,
          applicationId: data.applicationId,
          action: "Interview Scheduled",
          details: `${data.round} scheduled for ${currentApp.candidate.fullName} with ${data.interviewer}`,
        },
      }),
    ]);

    const { subject, html } = interviewScheduledEmail(
      currentApp.candidate.fullName,
      currentApp.job.title,
      data.round,
      data.interviewer,
      start
    );

    const ics = generateInterviewICS({
      uid: `${data.applicationId}-${start.getTime()}`,
      title: `${data.round} — ${currentApp.job.title}`,
      description: `Interview with ${currentApp.candidate.fullName} for ${currentApp.job.title}. Interviewer: ${data.interviewer}.`,
      start,
      durationMinutes: duration,
    });

    // Fire-and-forget — notification failures shouldn't undo the scheduled interview.
    sendEmail(currentApp.candidate.email, subject, html, [
      { filename: "interview.ics", content: ics, contentType: "text/calendar; method=PUBLISH" },
    ]).catch((emailError) => {
      console.error("[scheduleInterviewAction] interview scheduled OK but notification email failed:", emailError);
    });

    revalidatePath(`/dashboard/jobs/${data.jobId}`);
    revalidatePath(`/dashboard/interviews`);

    return { success: "Interview scheduled successfully!" };
  } catch (error) {
    console.error("Scheduling error:", error);
    return { error: "Failed to schedule interview." };
  }
}

export async function submitInterviewFeedbackAction(data: {
  interviewId: string;
  result: "PASSED" | "FAILED" | "PENDING";
  rating: number; // 1-5
  feedback: string;
}) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  if (data.rating < 1 || data.rating > 5) {
    return { error: "Rating must be between 1 and 5." };
  }

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: data.interviewId },
      select: { application: { select: { job: { select: { userId: true } } }, applicationId: true } as never, applicationId: true },
    });

    // Ownership check — same pattern as scheduleInterviewAction: walk
    // interview -> application -> job.userId, never trust a client-passed id alone.
    const owned = await prisma.interview.findFirst({
      where: { id: data.interviewId, application: { job: { userId } } },
      select: { id: true, applicationId: true },
    });
    if (!owned) return { error: "Interview not found or unauthorized." };

    await prisma.$transaction([
      prisma.interview.update({
        where: { id: data.interviewId },
        data: { result: data.result, rating: data.rating, feedback: data.feedback },
      }),
      prisma.activityLog.create({
        data: {
          userId,
          applicationId: owned.applicationId,
          action: "Interview Feedback Submitted",
          details: `Result: ${data.result}, Rating: ${data.rating}/5`,
        },
      }),
    ]);

    revalidatePath("/dashboard/interviews");
    return { success: "Feedback saved." };
  } catch (error) {
    console.error("[submitInterviewFeedbackAction] failed:", error);
    return { error: "Failed to save feedback." };
  }
}