"use server";

import { prisma } from "@/lib/prisma";
import { requireOrg, requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { interviewScheduledEmail, interviewCancelledEmail } from "@/lib/email-templates";
import { generateInterviewICS } from "@/lib/generate-ics";
import { createMeetEvent, deleteMeetEvent } from "@/lib/google-calendar";
import { canEditPipeline } from "@/lib/roles";
import { randomBytes } from "crypto";
import { decryptSecret } from "@/lib/encrypted-secret";
import { z } from "zod";

const ScheduleInterviewSchema = z.object({
  applicationId: z.string().min(1),
  round: z.string().trim().min(1).max(120),
  interviewer: z.string().trim().min(1).max(120),
  interviewerId: z.string().min(1).optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  jobId: z.string().min(1),
  targetStage: z.string().trim().min(1).max(120).refine((value) => !["APPLIED", "OFFER", "REJECTED", "HIRED"].includes(value.toUpperCase()), "Invalid interview stage."),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
});

export async function scheduleInterviewAction(data: z.infer<typeof ScheduleInterviewSchema>) {
  const parsed = ScheduleInterviewSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid interview details." };
  data = parsed.data;
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't schedule interviews." };

  const duration = data.durationMinutes ?? 60;
  const start = new Date(data.scheduledAt);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) return { error: "Interview time must be a valid future date." };
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
    let googleEventId: string | null = null;
    
    if (org?.googleRefreshToken) {
      try {
        const attendees = [currentApp.candidate.email];
        if (interviewerEmail) attendees.push(interviewerEmail);
        
        const calendarEvent = await createMeetEvent({
          refreshToken: decryptSecret(org.googleRefreshToken),
          summary: `${data.round} — ${currentApp.job.title}`,
          description: `Interview with ${currentApp.candidate.fullName} for ${currentApp.job.title}. Interviewer: ${data.interviewer}.`,
          start,
          durationMinutes: duration,
          attendeeEmails: attendees,
          timezone: data.timezone || "UTC",
        });
        
        meetingLink = calendarEvent.meetingLink;
        googleEventId = calendarEvent.eventId;
      } catch (calendarError) {
        console.error("[scheduleInterviewAction] Meet link creation failed:", calendarError);
      }
    }

    // ✅ Now include googleEventId in the create
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
          googleEventId, // ✅ now exists in schema
        },
      }),
      prisma.jobApplication.update({
        where: { id: data.applicationId },
        data: { stage: data.targetStage },
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
    revalidatePath("/dashboard");

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
  if (!canEditPipeline(ctx.role)) return { error: "Only recruiters can rate interviewers." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Rating must be between 1 and 5." };

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { interviewerId: true, application: { select: { job: { select: { organizationId: true } } } } },
  });
  if (!interview) return { error: "Interview not found." };
  if (interview.application.job.organizationId !== ctx.organizationId) return { error: "Unauthorized" };
  if (interview.interviewerId === ctx.userId) return { error: "You can't rate your own interview." };

  await prisma.interview.update({ where: { id: interviewId }, data: { interviewerRating: rating } });
  revalidatePath("/dashboard/interviews");
  return { success: "Interviewer rated." };
}

export async function cancelInterviewAction(interviewId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't cancel interviews." };

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        round: true,
        scheduledAt: true,
        applicationId: true,
        googleEventId: true,
        application: {
          select: {
            stage: true,
            job: { select: { id: true, organizationId: true, title: true } },
            candidate: { select: { fullName: true, email: true } },
          },
        },
      },
    });
    if (!interview || interview.application.job.organizationId !== ctx.organizationId) {
      return { error: "Interview not found or unauthorized." };
    }

    // Best-effort: cancel the Calendar event too, if there is one. Never let
    // this block the actual cancellation — the org may have disconnected
    // Google Calendar since this interview was scheduled, for instance.
    if (interview.googleEventId) {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { googleRefreshToken: true },
      });
      if (org?.googleRefreshToken) {
        try {
          await deleteMeetEvent({ refreshToken: decryptSecret(org.googleRefreshToken), eventId: interview.googleEventId });
        } catch (calendarError) {
          console.error("[cancelInterviewAction] Calendar event deletion failed, continuing:", calendarError);
        }
      }
    }

    // Stage names like "APPLIED"/"OFFER"/"HIRED"/"REJECTED" aren't tied to a
    // specific interview, so never auto-revert those. Everything else is a
    // round-name stage set by scheduleInterviewAction — if this was the last
    // interview backing that stage, drop the app back to APPLIED so it stops
    // being counted as "in interview" (overview stats, kanban board, etc.)
    const TERMINAL_OR_NON_ROUND_STAGES = new Set(["APPLIED", "OFFER", "HIRED", "REJECTED"]);

    await prisma.$transaction(async (tx) => {
      await tx.interview.delete({ where: { id: interviewId } });

      await tx.activityLog.create({
        data: {
          userId: ctx.userId,
          applicationId: interview.applicationId,
          action: "Interview Cancelled",
          details: `${interview.round} with ${interview.application.candidate.fullName} was cancelled`,
        },
      });

      if (!TERMINAL_OR_NON_ROUND_STAGES.has(interview.application.stage)) {
        const remaining = await tx.interview.count({ where: { applicationId: interview.applicationId } });
        if (remaining === 0) {
          await tx.jobApplication.update({
            where: { id: interview.applicationId },
            data: { stage: "APPLIED" },
          });
          await tx.activityLog.create({
            data: {
              userId: ctx.userId,
              applicationId: interview.applicationId,
              action: `Moved to APPLIED`,
              details: `${interview.application.candidate.fullName} reverted to Applied — last interview for this round was cancelled`,
            },
          });
        }
      }
    });

    const { subject, html } = interviewCancelledEmail(
      interview.application.candidate.fullName,
      interview.application.job.title,
      interview.round,
      interview.scheduledAt
    );
    sendEmail(interview.application.candidate.email, subject, html).catch((emailError) => {
      console.error("[cancelInterviewAction] interview cancelled OK but notification email failed:", emailError);
    });

    revalidatePath("/dashboard/interviews");
    revalidatePath(`/dashboard/jobs/${interview.application.job.id}`);
    revalidatePath("/dashboard");
    return { success: "Interview cancelled." };
  } catch (error) {
    console.error("[cancelInterviewAction] failed:", error);
    return { error: "Failed to cancel interview." };
  }
}
/* ✅ Recruiters send a private feedback link to the candidate */
export async function sendInterviewFeedbackLinkAction(interviewId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Only recruiters can request feedback." };

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        round: true,
        interviewer: true,
        application: {
          select: {
            candidate: { select: { email: true, fullName: true } },
            job: { select: { organizationId: true, title: true } },
          },
        },
      },
    });
    if (!interview) return { error: "Interview not found." };
    if (interview.application.job.organizationId !== ctx.organizationId) return { error: "Unauthorized" };

    const token = randomBytes(24).toString("hex");
    const identifier = `interview-feedback:${interviewId}`;

    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: { identifier, token, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${baseUrl}/rate-interview?token=${token}`;

    await sendEmail(
      interview.application.candidate.email,
      `How was your ${interview.round} interview at ${interview.application.job.title}?`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2>We'd love your feedback</h2>
        <p>Hi ${interview.application.candidate.fullName}, thanks for interviewing with us.
        Please rate your experience with <strong>${interview.interviewer}</strong> — it takes 5 seconds and is completely confidential.</p>
        <p><a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Rate my interview</a></p>
        <p style="color:#a1a1aa;font-size:12px;">This link expires in 7 days and works only for you.</p>
      </div>`
    );

    return { success: "Feedback link emailed to the candidate." };
  } catch (error) {
    console.error("[sendInterviewFeedbackLinkAction] failed:", error);
    return { error: "Couldn't send the feedback link." };
  }
}

/* ✅ ONLY the candidate (with the private token) can submit the rating */
export async function submitInterviewExperienceRatingAction(token: string, rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5 stars." };
  }

  try {
    const rec = await prisma.verificationToken.findFirst({ where: { token } });
    if (!rec || rec.expires < new Date() || !rec.identifier.startsWith("interview-feedback:")) {
      return { error: "This feedback link is invalid or has expired." };
    }

    const interviewId = rec.identifier.replace("interview-feedback:", "");
    await prisma.interview.update({
      where: { id: interviewId },
      data: { interviewerRating: rating },
    });
    await prisma.verificationToken.delete({ where: { token } }); // one-time link

    return { success: "Thanks for your feedback!" };
  } catch (error) {
    console.error("[submitInterviewExperienceRatingAction] failed:", error);
    return { error: "Couldn't save your rating. Please try again." };
  }
}