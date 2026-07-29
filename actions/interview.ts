"use server";

import { prisma } from "@/lib/prisma";
import { requireOrg, requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { interviewScheduledEmail } from "@/lib/email-templates";
import { generateInterviewICS } from "@/lib/generate-ics";
import { createMeetEvent } from "@/lib/google-calendar";
import { canEditPipeline } from "@/lib/roles";
import { ApplicationStage } from "@prisma/client";

export async function scheduleInterviewAction(data: {
  applicationId: string;
  round: string;
  interviewer: string;
  interviewerId?: string;
  scheduledAt: string;
  jobId: string;
  targetStage: string;
  durationMinutes?: number;
}) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't schedule interviews." };

  const duration = data.durationMinutes ?? 60;
  const start = new Date(data.scheduledAt);
  const end = new Date(start.getTime() + duration * 60_000);

  try {
    const [currentApp, org] = await Promise.all([
      prisma.jobApplication.findUnique({
        where: { id: data.applicationId },
        select: {
          stage: true,
          candidate: { select: { fullName: true, email: true } },
          job: { select: { organizationId: true, title: true } },
        },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { googleRefreshToken: true },
      }),
    ]);

    if (!currentApp) return { error: "Application not found." };
    if (currentApp.job.organizationId !== ctx.organizationId) return { error: "Unauthorized" };

    // If a team member was picked (not free text), make sure they're actually
    // on this org — stops assigning someone else's account by a stale/forged id.
    let interviewerEmail: string | null = null;
    if (data.interviewerId) {
      const isMember = await prisma.membership.findFirst({
        where: { userId: data.interviewerId, organizationId: ctx.organizationId },
        select: { id: true, user: { select: { email: true } } },
      });
      if (!isMember) return { error: "Selected interviewer isn't on your team." };
      interviewerEmail = isMember.user.email;
    }

    const scanStart = new Date(start.getTime() - 4 * 60 * 60_000);
    const scanEnd = new Date(end.getTime() + 4 * 60 * 60_000);
    const nearby = await prisma.interview.findMany({
      where: {
        interviewer: data.interviewer,
        application: { job: { organizationId: ctx.organizationId } },
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

    // Best-effort: if the org has Google Calendar connected, create a real
    // event with an auto Meet link. Never let a Calendar failure block
    // scheduling the interview itself.
    let meetingLink: string | null = null;
    if (org?.googleRefreshToken) {
      try {
        const attendees = [currentApp.candidate.email];
        if (interviewerEmail) attendees.push(interviewerEmail);
        meetingLink = await createMeetEvent({
          refreshToken: org.googleRefreshToken,
          summary: `${data.round} — ${currentApp.job.title}`,
          description: `Interview with ${currentApp.candidate.fullName} for ${currentApp.job.title}. Interviewer: ${data.interviewer}.`,
          start,
          durationMinutes: duration,
          attendeeEmails: attendees,
        });
      } catch (calendarError) {
        console.error("[scheduleInterviewAction] Meet link creation failed, continuing without it:", calendarError);
      }
    }

    await prisma.$transaction([
      prisma.interview.create({
        data: {
          applicationId: data.applicationId,
          round: data.round,
          interviewer: data.interviewer,
          interviewerId: data.interviewerId ?? null,
          scheduledAt: start,
          durationMinutes: duration,
          meetingLink,
        },
      }),
      prisma.jobApplication.update({
        where: { id: data.applicationId },
        data: { stage: data.targetStage as ApplicationStage },
      }),
      prisma.activityLog.create({
        data: {
          userId: ctx.userId,
          applicationId: data.applicationId,
          action: "Interview Scheduled",
          details: `${data.round} scheduled for ${currentApp.candidate.fullName} with ${data.interviewer}`,
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: ctx.userId,
          applicationId: data.applicationId,
          action: `Moved to ${data.targetStage}`,
          details: `${currentApp.candidate.fullName} shifted from ${currentApp.stage} to ${data.targetStage}`,
        },
      }),
    ]);

    const { subject, html } = interviewScheduledEmail(
      currentApp.candidate.fullName,
      currentApp.job.title,
      data.round,
      data.interviewer,
      start,
      meetingLink
    );
    const ics = generateInterviewICS({
      uid: `${data.applicationId}-${start.getTime()}`,
      title: `${data.round} — ${currentApp.job.title}`,
      description: `Interview with ${currentApp.candidate.fullName} for ${currentApp.job.title}. Interviewer: ${data.interviewer}.${meetingLink ? ` Join: ${meetingLink}` : ""}`,
      start,
      durationMinutes: duration,
      location: meetingLink ?? undefined,
    });

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
  rating: number;
  feedback: string;
}) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };
  if (data.rating < 1 || data.rating > 5) return { error: "Rating must be between 1 and 5." };

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: data.interviewId },
      select: {
        id: true,
        applicationId: true,
        interviewerId: true,
        application: { select: { job: { select: { organizationId: true } } } },
      },
    });
    if (!interview) return { error: "Interview not found or unauthorized." };

    // Access = either you're the specific person this interview is assigned
    // to (works across every org you're linked to), or you're on the org that
    // owns this job (recruiters/admins entering feedback on someone's behalf,
    // or legacy interviews with no linked account).
    const isAssignedInterviewer = interview.interviewerId === userId;
    if (!isAssignedInterviewer) {
      const membership = await prisma.membership.findFirst({
        where: { userId, organizationId: interview.application.job.organizationId },
        select: { id: true },
      });
      if (!membership) return { error: "Interview not found or unauthorized." };
    }

    await prisma.$transaction([
      prisma.interview.update({
        where: { id: data.interviewId },
        data: { result: data.result, rating: data.rating, feedback: data.feedback },
      }),
      prisma.activityLog.create({
        data: {
          userId,
          applicationId: interview.applicationId,
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

export async function getMyAssignedInterviewsAction() {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", interviews: [] };

  try {
    const interviews = await prisma.interview.findMany({
      where: { interviewerId: userId },
      select: {
        id: true,
        round: true,
        interviewer: true,
        meetingLink: true,
        scheduledAt: true,
        result: true,
        rating: true,
        feedback: true,
        application: {
          select: {
            job: { select: { id: true, title: true, organization: { select: { name: true } } } },
            candidate: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return { interviews };
  } catch (error) {
    console.error("[getMyAssignedInterviewsAction] failed:", error);
    return { error: "Failed to load your interviews.", interviews: [] };
  }
}
export async function rateInterviewerAction(interviewId: string, rating: number) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (rating < 1 || rating > 5) return { error: "Rating must be between 1 and 5." };

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, interviewerId: true, application: { select: { job: { select: { organizationId: true } } } } },
    });
    if (!interview || interview.application.job.organizationId !== ctx.organizationId) {
      return { error: "Interview not found or unauthorized." };
    }
    if (!interview.interviewerId) {
      return { error: "This interviewer isn't a linked HireKarlo account, nothing to rate." };
    }

    await prisma.interview.update({ where: { id: interviewId }, data: { interviewerRating: rating } });
    revalidatePath("/dashboard/interviews");
    return { success: "Rating saved." };
  } catch (error) {
    console.error("[rateInterviewerAction] failed:", error);
    return { error: "Failed to save rating." };
  }
}