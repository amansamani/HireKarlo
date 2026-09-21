"use server";
import { logError } from "@/lib/logger";

import { canEditPipeline, PIPELINE_EDITOR_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";

export async function getRecruiterAnalyticsAction() {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) return { error: "Unauthorized", stats: null };

  try {
    const [totalJobs, applicationGroups, scheduledInterviews] = await Promise.all([
      prisma.job.count({ where: { organizationId: ctx.organizationId, status: "OPEN" } }),
      prisma.jobApplication.groupBy({
        by: ["stage"],
        where: { job: { organizationId: ctx.organizationId } },
        _count: { _all: true },
      }),
      prisma.interview.count({ where: { scheduledAt: { gte: new Date() }, application: { job: { organizationId: ctx.organizationId }, stage: { notIn: ["HIRED", "REJECTED"] } } } }),
    ]);

    let totalApplications = 0, totalOffers = 0, totalHired = 0;

    for (const group of applicationGroups) {
      const count = group._count._all;
      const stage = group.stage;
      totalApplications += count;
      if (stage === "OFFER") totalOffers += count;
      else if (stage === "HIRED") totalHired += count;
    }

    return { stats: { totalJobs, totalApplications, totalOffers, totalInterviews: scheduledInterviews, totalHired } };
  } catch (error) {
    logError("actions.analytics", error);
    return { error: "Failed to compile aggregate platform metrics.", stats: null };
  }
}
/* ✅ Live notification feed built from real data — no schema change needed */
export async function getNotificationsAction() {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) return { error: "Unauthorized", notifications: [], pendingInvites: 0 };

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [apps, interviews, pendingInvites, pendingReviews] = await Promise.all([
      prisma.jobApplication.findMany({
        where: { job: { organizationId: ctx.organizationId }, appliedDate: { gte: weekAgo } },
        select: {
          id: true,
          appliedDate: true,
          matchScore: true,
          candidate: { select: { fullName: true } },
          job: { select: { title: true } },
        },
        orderBy: { appliedDate: "desc" },
        take: 8,
      }),
      prisma.interview.findMany({
        where: {
          application: { job: { organizationId: ctx.organizationId } },
          scheduledAt: { gte: now },
        },
        select: {
          id: true,
          round: true,
          scheduledAt: true,
          interviewer: true,
          application: { select: { candidate: { select: { fullName: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
      prisma.teamInvite.count({ where: { organizationId: ctx.organizationId, expires: { gt: now } } }),
      // Failed scorecards waiting for a recruiter decision. Not limited to the 7-day window: it stays until decided.
      prisma.interview.findMany({
        where: { reviewStatus: "PENDING_REVIEW", application: { job: { organizationId: ctx.organizationId } } },
        select: { id: true, round: true, reviewAssigneeId: true, scorecardSubmittedAt: true, updatedAt: true, application: { select: { candidate: { select: { fullName: true } }, job: { select: { title: true } } } } },
        orderBy: { updatedAt: "desc" },
        take: 25,
      }),
    ]);

    // The alert goes to the assigned recruiter. If they have since lost pipeline access,
    // it falls back to the workspace owner so a decision can't be orphaned.
    const assigneeIds = [...new Set(pendingReviews.flatMap(r => (r.reviewAssigneeId ? [r.reviewAssigneeId] : [])))];
    const activeAssignees = new Set((await prisma.membership.findMany({
      where: { organizationId: ctx.organizationId, userId: { in: assigneeIds }, role: { in: [...PIPELINE_EDITOR_ROLES] } },
      select: { userId: true },
    })).map(m => m.userId));
    const reviewAlerts = pendingReviews
      .filter(r => r.reviewAssigneeId === ctx.userId || (ctx.role === "OWNER" && (!r.reviewAssigneeId || !activeAssignees.has(r.reviewAssigneeId))))
      .map(r => ({
        id: `review-${r.id}`,
        type: "interview_review" as const,
        title: `${r.application.candidate.fullName} did not pass ${r.round}`,
        meta: `Decision needed · ${r.application.job.title}`,
        at: r.scorecardSubmittedAt ?? r.updatedAt,
      }));

    const notifications = [
      ...apps.map((a) => ({
        id: `app-${a.id}`,
        type: "application" as const,
        title: `${a.candidate.fullName} applied to ${a.job.title}`,
        meta: a.matchScore !== null ? `${a.matchScore}% match` : "New application",
        at: a.appliedDate,
      })),
      ...interviews.map((i) => ({
        id: `iv-${i.id}`,
        type: "interview" as const,
        title: `${i.round} interview with ${i.application.candidate.fullName}`,
        meta: `Interviewer: ${i.interviewer}`,
        at: i.scheduledAt,
      })),
    ]
      .sort((x, y) => +new Date(y.at) - +new Date(x.at))
      .slice(0, 10);

    // Open decisions always lead the feed, ahead of the routine items.
    return { notifications: [...reviewAlerts.slice(0, 10), ...notifications].slice(0, 12), pendingInvites };
  } catch (error) {
    logError("actions.analytics", error);
    return { error: "Failed to load notifications.", notifications: [], pendingInvites: 0 };
  }
}