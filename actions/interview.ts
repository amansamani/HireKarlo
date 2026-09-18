"use server";
import { hashBearerToken, bearerTokenCandidates } from "@/lib/bearer-token";
import { logError } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { requireOrg, requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { enqueueEmail, dispatchQueuedEmail } from "@/lib/send-email";
import { interviewScheduledEmail, interviewCancelledEmail } from "@/lib/email-templates";
import { generateInterviewICS } from "@/lib/generate-ics";
import { createMeetEvent, deleteMeetEvent } from "@/lib/google-calendar";
import { canEditPipeline } from "@/lib/roles";
import { randomBytes } from "crypto";
import { decryptSecret } from "@/lib/encrypted-secret";
import { escapeHtml } from "@/lib/html";
import { z } from "zod";
import { lockOrganization } from "@/lib/entitlements";

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
  let savedInterviewId: string | null = null;

  try {
    const [currentApp, org] = await Promise.all([
      prisma.jobApplication.findUnique({
        where: { id: data.applicationId },
        select: {
          stage: true,
          candidate: { select: { fullName: true, email: true } },
          job: { select: { id: true, organizationId: true, title: true, interviewRounds: true } },
        },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { googleRefreshToken: true },
      }),
    ]);

    if (!currentApp) return { error: "Application not found." };
    if (currentApp.job.organizationId !== ctx.organizationId || currentApp.job.id !== data.jobId) return { error: "Unauthorized" };
    const allowedRounds = currentApp.job.interviewRounds.length ? currentApp.job.interviewRounds : ["Interview", "TECHNICAL", "HR"];
    if (!allowedRounds.includes(data.targetStage)) return { error: "Unknown interview round." };
    try { new Intl.DateTimeFormat("en", { timeZone: data.timezone || "UTC" }); }
    catch { return { error: "Invalid timezone." }; }

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

    // Reserve the slot and notification before calling external Calendar APIs.
    let meetingLink: string | null = null, googleEventId: string | null = null;
    const reservation = await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${data.applicationId} FOR UPDATE`;
      const fresh = await tx.jobApplication.findUniqueOrThrow({where:{id:data.applicationId},select:{stage:true}});
      if (["HIRED","REJECTED"].includes(fresh.stage)) throw new Error("TERMINAL_APPLICATION");
    const scanStart = new Date(start.getTime() - 8 * 60 * 60_000);
    const scanEnd = new Date(end.getTime() + 8 * 60 * 60_000);
    const nearby = await tx.interview.findMany({
      where: {
        ...(data.interviewerId ? { interviewerId: data.interviewerId } : { interviewer: data.interviewer }),
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
      throw new Error("SCHEDULE_CONFLICT");
    }


      const interview = await tx.interview.create({ data: { applicationId: data.applicationId, pipelineStage: data.targetStage, round: data.round, interviewer: data.interviewer, interviewerId: data.interviewerId ?? null, scheduledAt: start, durationMinutes: duration } });
      await tx.jobApplication.update({ where: { id: data.applicationId }, data: { stage: data.targetStage } });
      await tx.activityLog.create({ data: { userId: ctx.userId, applicationId: data.applicationId, action: "Interview Scheduled", details: data.round } });
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


      const emailId = await enqueueEmail(tx, currentApp.candidate.email, subject, html, [{ filename: "interview.ics", content: ics, contentType: "text/calendar; method=PUBLISH" }], `interview-scheduled:${interview.id}`, start);
      await tx.emailOutbox.update({ where: { id: emailId }, data: { availableAt: new Date(Date.now() + 60_000) } });
      return { interviewId: interview.id, emailId };
    });
    savedInterviewId = reservation.interviewId;
    // Best-effort: if the org has Google Calendar connected, create a real
    // event with an auto Meet link. Never let a Calendar failure block
    // scheduling the interview itself.

    
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
        logError("actions.interview", calendarError);
      }
    }


    if (googleEventId) {
      const updated = await prisma.interview.updateMany({ where: { id: reservation.interviewId }, data: { meetingLink, googleEventId } });
      if (!updated.count && org?.googleRefreshToken) await deleteMeetEvent({ refreshToken: decryptSecret(org.googleRefreshToken), eventId: googleEventId }).catch(() => {});
    }
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


    await prisma.emailOutbox.updateMany({ where: { id: reservation.emailId, sentAt: null, failedAt: null, leaseUntil: null }, data: { subject, html, attachments: [{ filename: "interview.ics", content: ics, contentType: "text/calendar; method=PUBLISH" }], availableAt: new Date() } });
    dispatchQueuedEmail(reservation.emailId);
    revalidatePath(`/dashboard/jobs/${data.jobId}`);
    revalidatePath(`/dashboard/interviews`);
    revalidatePath("/dashboard");

    return { success: "Interview scheduled successfully!" };
  } catch (error) {
    logError("actions.interview", error);
    if (savedInterviewId) return { success: "Interview scheduled. Calendar details or notification delivery may be pending." };
    if (error instanceof Error && error.message === "TERMINAL_APPLICATION") return { error: "Cannot schedule an interview for a hired or rejected application." };
    return { error: error instanceof Error && error.message === "SCHEDULE_CONFLICT" ? "This interviewer already has an interview overlapping this time." : "Failed to schedule interview." };
  }
}

export async function submitInterviewFeedbackAction(data: {
  interviewId: string;
  result: "PASSED" | "FAILED" | "PENDING";
  rating: number;
  feedback: string;
}) {
  const parsed = z.object({ interviewId: z.string().min(1), result: z.enum(["PASSED", "FAILED", "PENDING"]), rating: z.number().int().min(1).max(5), feedback: z.string().trim().max(10000) }).safeParse(data);
  if (!parsed.success) return { error: "Invalid feedback." };
  data = parsed.data;
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
    const membership = await prisma.membership.findFirst({
        where: { userId, organizationId: interview.application.job.organizationId },
        select: { role: true },
      });
    if (!membership || (!canEditPipeline(membership.role) && interview.interviewerId !== userId)) return { error: "Interview not found or unauthorized." };

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
    logError("actions.interview", error);
    return { error: "Failed to save feedback." };
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

  let cancellationSaved = false;
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        round: true,
        scheduledAt: true,
        applicationId: true,
        pipelineStage: true,
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

    // Stage names like "APPLIED"/"OFFER"/"HIRED"/"REJECTED" aren't tied to a
    // specific interview, so never auto-revert those. Everything else is a
    // round-name stage set by scheduleInterviewAction — if this was the last
    // interview backing that stage, drop the app back to APPLIED so it stops
    // being counted as "in interview" (overview stats, kanban board, etc.)
    const TERMINAL_OR_NON_ROUND_STAGES = new Set(["APPLIED", "OFFER", "HIRED", "REJECTED"]);

    const template = interviewCancelledEmail(interview.application.candidate.fullName, interview.application.job.title, interview.round, interview.scheduledAt);
    const queuedId = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${interview.applicationId} FOR UPDATE`;
      const current = await tx.jobApplication.findUniqueOrThrow({ where: { id: interview.applicationId }, select: { stage: true } });
      const removed = await tx.interview.delete({ where: { id: interviewId } });

      await tx.activityLog.create({
        data: {
          userId: ctx.userId,
          applicationId: interview.applicationId,
          action: "Interview Cancelled",
          details: `${interview.round} with ${interview.application.candidate.fullName} was cancelled`,
        },
      });

      const ownedStage = interview.pipelineStage || interview.round;
      if (!TERMINAL_OR_NON_ROUND_STAGES.has(current.stage) && current.stage === ownedStage) {
        const remaining = await tx.interview.count({ where: { applicationId: interview.applicationId, OR: [{ pipelineStage: ownedStage }, { pipelineStage: null, round: ownedStage }] } });
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
      await tx.emailOutbox.updateMany({ where: { dedupeKey: `interview-scheduled:${interviewId}`, sentAt: null }, data: { failedAt: new Date() } });
      return { emailId: await enqueueEmail(tx, interview.application.candidate.email, template.subject, template.html), googleEventId: removed.googleEventId };
    });

    cancellationSaved = true;
    // Best-effort: cancel the Calendar event too, if there is one. Never let
    // this block the actual cancellation — the org may have disconnected
    // Google Calendar since this interview was scheduled, for instance.
    if (queuedId.googleEventId) {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { googleRefreshToken: true },
      });
      if (org?.googleRefreshToken) {
        try {
          await deleteMeetEvent({ refreshToken: decryptSecret(org.googleRefreshToken), eventId: queuedId.googleEventId });
        } catch (calendarError) {
          logError("actions.interview", calendarError);
        }
      }
    }

    dispatchQueuedEmail(queuedId.emailId);

    revalidatePath("/dashboard/interviews");
    revalidatePath(`/dashboard/jobs/${interview.application.job.id}`);
    revalidatePath("/dashboard");
    return { success: "Interview cancelled." };
  } catch (error) {
    logError("actions.interview", error);
    return cancellationSaved ? { success: "Interview cancelled. Calendar cleanup may be pending." } : { error: "Failed to cancel interview." };
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${baseUrl}/rate-interview?token=${token}`;

    const emailId = await prisma.$transaction(async tx => {
      await tx.verificationToken.deleteMany({ where: { identifier } });
      await tx.verificationToken.create({ data: { identifier, token: hashBearerToken(token), expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      return enqueueEmail(tx,
      interview.application.candidate.email,
      `How was your ${interview.round} interview at ${interview.application.job.title}?`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2>We'd love your feedback</h2>
        <p>Hi ${escapeHtml(interview.application.candidate.fullName)}, thanks for interviewing with us.
        Please rate your experience with <strong>${escapeHtml(interview.interviewer)}</strong> — your hiring team will receive the rating.</p>
        <p><a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Rate my interview</a></p>
        <p style="color:#a1a1aa;font-size:12px;">This private link expires in 7 days. Anyone with the link can submit feedback; do not share it.</p>
      </div>`, undefined, undefined, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    });
    dispatchQueuedEmail(emailId);
    return { success: "Feedback link queued for the candidate." };
  } catch (error) {
    logError("actions.interview", error);
    return { error: "Couldn't send the feedback link." };
  }
}

/* A single-use bearer link allows submission; possession does not prove identity. */
export async function submitInterviewExperienceRatingAction(token: string, rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5 stars." };
  }

  try {
    if (typeof token !== "string" || !token || token.length > 200) return { error: "Invalid feedback link." };
    const saved = await prisma.$transaction(async tx => {
      const rec = await tx.verificationToken.findFirst({ where: { token: { in: bearerTokenCandidates(token) }, identifier: { startsWith: "interview-feedback:" }, expires: { gt: new Date() } } });
      if (!rec) return false;
      const claimed = await tx.verificationToken.deleteMany({ where: { token: { in: bearerTokenCandidates(token) }, expires: { gt: new Date() } } });
      if (!claimed.count) return false;
      await tx.interview.update({ where: { id: rec.identifier.slice("interview-feedback:".length) }, data: { candidateExperienceRating: rating } });
      return true;
    });
    if (!saved) return { error: "This feedback link is invalid or has expired." };
    return { success: "Thanks for your feedback!" };
  } catch (error) {
    logError("actions.interview", error);
    return { error: "Couldn't save your rating. Please try again." };
  }
}
