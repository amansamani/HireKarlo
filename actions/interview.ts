"use server";
import { hashBearerToken, bearerTokenCandidates } from "@/lib/bearer-token";
import { logError } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { requireOrg, requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { enqueueEmail, dispatchQueuedEmail } from "@/lib/send-email";
import { interviewScheduledEmail, interviewCancelledEmail, interviewFailedRecruiterEmail, stageChangeEmail } from "@/lib/email-templates";
import { generateInterviewICS } from "@/lib/generate-ics";
import { createMeetEvent, deleteMeetEvent } from "@/lib/google-calendar";
import { canEditPipeline } from "@/lib/roles";
import { randomBytes } from "crypto";
import { decryptSecret } from "@/lib/encrypted-secret";
import { escapeHtml } from "@/lib/html";
import { z } from "zod";
import { lockOrganization } from "@/lib/entitlements";
import { recordAudit } from "@/lib/audit";
import { planReviewDecision, resolveAssignedRecruiter, reviewStatusAfterScorecard, type ReviewDecision } from "@/lib/interview-outcome";

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


      const interview = await tx.interview.create({ data: { applicationId: data.applicationId, pipelineStage: data.targetStage, round: data.round, interviewer: data.interviewer, interviewerId: data.interviewerId ?? null, scheduledById: ctx.userId, scheduledAt: start, durationMinutes: duration } });
      // Booking another round is the recruiter's "override": it settles any failed-scorecard decision still open.
      await tx.interview.updateMany({ where: { applicationId: data.applicationId, reviewStatus: "PENDING_REVIEW" }, data: { reviewStatus: "OVERRIDDEN", reviewedById: ctx.userId, reviewedAt: new Date(), reviewNote: "Re-interview scheduled" } });
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
  result: "PASSED" | "FAILED";
  rating: number;
  feedback: string;
}) {
  const parsed = z.object({ interviewId: z.string().min(1), result: z.enum(["PASSED", "FAILED"]), rating: z.number().int().min(1).max(5), feedback: z.string().trim().max(10000) }).safeParse(data);
  if (!parsed.success) return { error: "Invalid feedback." };
  data = parsed.data;
  if (data.result === "FAILED" && !data.feedback) return { error: "Add feedback explaining the result so the recruiter can review it." };
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  let queuedEmailId: string | null = null;
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: data.interviewId },
      select: {
        id: true,
        round: true,
        interviewer: true,
        applicationId: true,
        interviewerId: true,
        scheduledById: true,
        application: { select: { candidate: { select: { fullName: true } }, job: { select: { title: true, organizationId: true } } } },
      },
    });
    if (!interview) return { error: "Interview not found or unauthorized." };
    const organizationId = interview.application.job.organizationId;

    // Access = either you're the specific person this interview is assigned
    // to (works across every org you're linked to), or you're on the org that
    // owns this job (recruiters/admins entering feedback on someone's behalf,
    // or legacy interviews with no linked account).
    const membership = await prisma.membership.findFirst({
        where: { userId, organizationId },
        select: { role: true },
      });
    if (!membership || (!canEditPipeline(membership.role) && interview.interviewerId !== userId)) return { error: "Interview not found or unauthorized." };

    // Interviewers only assess. Submitting FAILED never touches the pipeline or emails the
    // candidate: it opens a decision for the recruiter (see reviewFailedInterviewAction).
    const reviewStatus = await prisma.$transaction(async tx => {
      // Lock order across the interview flows is Organization -> JobApplication -> Interview.
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${interview.applicationId} FOR UPDATE`;
      const application = await tx.jobApplication.findUniqueOrThrow({ where: { id: interview.applicationId }, select: { stage: true } });
      const nextReviewStatus = reviewStatusAfterScorecard(data.result, application.stage);
      const recruiter = nextReviewStatus ? await resolveAssignedRecruiter(tx, organizationId, interview.scheduledById) : null;

      // Compare-and-set: the scorecard is immutable once submitted, so a Pass cannot be flipped
      // to a Fail (or resubmitted) and a double click cannot alert the recruiter twice.
      const saved = await tx.interview.updateMany({
        where: { id: interview.id, result: null },
        data: {
          result: data.result, rating: data.rating, feedback: data.feedback, scorecardSubmittedAt: new Date(),
          reviewStatus: nextReviewStatus, reviewAssigneeId: recruiter?.id ?? null,
        },
      });
      if (saved.count !== 1) throw new Error("ALREADY_SUBMITTED");

      await tx.activityLog.create({
        data: {
          userId,
          applicationId: interview.applicationId,
          action: "Interview Feedback Submitted",
          details: `Result: ${data.result}, Rating: ${data.rating}/5`,
        },
      });

      if (recruiter) {
        await tx.activityLog.create({
          data: {
            userId,
            applicationId: interview.applicationId,
            action: "Awaiting Recruiter Decision",
            details: `${interview.application.candidate.fullName} did not pass ${interview.round}; ${recruiter.name || recruiter.email} was alerted`,
          },
        });
        // No self-alert when the recruiter entered the scorecard themselves.
        if (recruiter.id !== userId) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const template = interviewFailedRecruiterEmail({
            recruiterName: recruiter.name,
            candidateName: interview.application.candidate.fullName,
            jobTitle: interview.application.job.title,
            round: interview.round,
            interviewerName: interview.interviewer,
            rating: data.rating,
            feedback: data.feedback,
            reviewUrl: `${baseUrl}/dashboard/interviews`,
          });
          queuedEmailId = await enqueueEmail(tx, recruiter.email, template.subject, template.html, undefined, `interview-failed:${interview.id}`, new Date(Date.now() + 14 * 86_400_000));
        }
      }
      return nextReviewStatus;
    });

    if (queuedEmailId) dispatchQueuedEmail(queuedEmailId);
    revalidatePath("/dashboard/interviews");
    revalidatePath("/dashboard");
    return reviewStatus
      ? { success: "Scorecard saved. Your recruiter has been alerted and will decide the next step.", reviewStatus }
      : { success: "Feedback saved.", reviewStatus: null };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_SUBMITTED") return { error: "A scorecard was already submitted for this interview." };
    logError("actions.interview", error);
    return { error: "Failed to save feedback." };
  }
}

/**
 * Recruiter decision gate for a FAILED scorecard.
 *  CONFIRM_REJECTION → application moves to REJECTED, the candidate gets one status email, and any
 *                      other upcoming interview for that application is cancelled.
 *  OVERRIDE          → nothing changes for the candidate; the recruiter routes the card manually
 *                      (advance, re-interview, other role, reject later).
 * Only OWNER / ADMIN / RECRUITER may call this. Interviewers can never move a card.
 */
export async function reviewFailedInterviewAction(data: { interviewId: string; decision: ReviewDecision; note?: string }) {
  const parsed = z.object({ interviewId: z.string().min(1), decision: z.enum(["CONFIRM_REJECTION", "OVERRIDE"]), note: z.string().trim().max(1000).optional() }).safeParse(data);
  if (!parsed.success) return { error: "Invalid decision." };
  const { interviewId, decision, note } = parsed.data;
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Only recruiters and owners can decide on a failed interview." };

  let queuedEmailId: string | null = null;
  let cancelledEvents: string[] = [];
  let jobId = "";
  try {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        round: true,
        applicationId: true,
        application: { select: { stage: true, candidate: { select: { fullName: true, email: true } }, job: { select: { id: true, title: true, organizationId: true } } } },
      },
    });
    if (!interview || interview.application.job.organizationId !== ctx.organizationId) return { error: "Interview not found or unauthorized." };
    jobId = interview.application.job.id;
    const candidate = interview.application.candidate;

    await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      await tx.$queryRaw`SELECT "id" FROM "JobApplication" WHERE "id" = ${interview.applicationId} FOR UPDATE`;
      const application = await tx.jobApplication.findUniqueOrThrow({ where: { id: interview.applicationId }, select: { stage: true } });
      const plan = planReviewDecision(decision, application.stage);
      if (!plan.ok) throw new Error(plan.reason);

      // Compare-and-set: two recruiters (or a double click) cannot both decide.
      const now = new Date();
      const claimed = await tx.interview.updateMany({
        where: { id: interviewId, reviewStatus: "PENDING_REVIEW" },
        data: { reviewStatus: plan.nextReviewStatus, reviewedById: ctx.userId, reviewedAt: now, reviewNote: note || null },
      });
      if (claimed.count !== 1) throw new Error("NOT_PENDING");

      if (decision === "OVERRIDE") {
        await tx.activityLog.create({ data: { userId: ctx.userId, applicationId: interview.applicationId, action: "Failed Scorecard Overridden", details: note ? `${interview.round}: ${note}` : `${interview.round} result overridden by the recruiter` } });
        await recordAudit(tx, ctx, "INTERVIEW_REJECTION_OVERRIDDEN", interviewId);
        return;
      }

      // Any other failed round still waiting on a decision for this application is settled by the same decision.
      await tx.interview.updateMany({ where: { applicationId: interview.applicationId, reviewStatus: "PENDING_REVIEW" }, data: { reviewStatus: "REJECTION_CONFIRMED", reviewedById: ctx.userId, reviewedAt: now, reviewNote: note || null } });

      if (plan.moveToRejected) {
        await tx.jobApplication.update({ where: { id: interview.applicationId }, data: { stage: "REJECTED" } });
        await tx.activityLog.create({ data: { userId: ctx.userId, applicationId: interview.applicationId, action: "Moved to REJECTED", details: `${candidate.fullName} shifted from ${application.stage} to REJECTED after a failed ${interview.round} scorecard` } });
      }
      if (plan.notifyCandidate) {
        const template = stageChangeEmail(candidate.fullName, interview.application.job.title, "REJECTED");
        queuedEmailId = await enqueueEmail(tx, candidate.email, template.subject, template.html, undefined, `interview-rejection:${interviewId}`);
      }

      // The candidate is out: upcoming rounds must not send reminders or hold calendar slots.
      const upcoming = await tx.interview.findMany({ where: { applicationId: interview.applicationId, id: { not: interviewId }, result: null, scheduledAt: { gt: now } }, select: { id: true, round: true, googleEventId: true } });
      if (upcoming.length) {
        const ids = upcoming.map(i => i.id);
        await tx.emailOutbox.updateMany({ where: { dedupeKey: { in: ids.flatMap(id => [`interview-scheduled:${id}`, `interview-reminder:${id}`]) }, sentAt: null, failedAt: null }, data: { failedAt: now } });
        await tx.interview.deleteMany({ where: { id: { in: ids } } });
        await tx.activityLog.create({ data: { userId: ctx.userId, applicationId: interview.applicationId, action: "Interview Cancelled", details: `${upcoming.map(i => i.round).join(", ")} cancelled because the application was rejected` } });
        cancelledEvents = upcoming.flatMap(i => (i.googleEventId ? [i.googleEventId] : []));
      }
      await recordAudit(tx, ctx, "INTERVIEW_REJECTION_CONFIRMED", interviewId);
    });

    if (cancelledEvents.length) {
      const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { googleRefreshToken: true } });
      if (org?.googleRefreshToken) {
        for (const eventId of cancelledEvents) {
          try { await deleteMeetEvent({ refreshToken: decryptSecret(org.googleRefreshToken), eventId }); }
          catch (calendarError) { logError("actions.interview", calendarError); }
        }
      }
    }
    if (queuedEmailId) dispatchQueuedEmail(queuedEmailId);
    revalidatePath("/dashboard/interviews");
    revalidatePath(`/dashboard/jobs/${jobId}`);
    revalidatePath("/dashboard");
    return { success: decision === "CONFIRM_REJECTION" ? `${candidate.fullName} was moved to Rejected and notified.` : "Result overridden. Route the candidate from the pipeline." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_PENDING") return { error: "This result was already decided." };
      if (error.message === "ALREADY_HIRED") return { error: "This candidate is already hired, so the failed round can't reject them." };
      if (error.message.startsWith("Your trial or subscription")) return { error: error.message };
    }
    logError("actions.interview", error);
    return { error: "Failed to record the decision." };
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
