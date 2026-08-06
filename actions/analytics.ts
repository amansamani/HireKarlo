"use server";

import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";

export async function getRecruiterAnalyticsAction() {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized", stats: null };

  try {
    const [totalJobs, applicationGroups] = await Promise.all([
      prisma.job.count({ where: { organizationId: ctx.organizationId } }),
      prisma.jobApplication.groupBy({
        by: ["stage"],
        where: { job: { organizationId: ctx.organizationId } },
        _count: { _all: true },
      }),
    ]);

    let totalApplications = 0, totalOffers = 0, totalHired = 0, totalInterviews = 0;

    for (const group of applicationGroups) {
      const count = group._count._all;
      const stage = group.stage;
      totalApplications += count;
      if (stage === "OFFER") totalOffers += count;
      else if (stage === "HIRED") totalHired += count;
      else if (stage !== "APPLIED" && stage !== "REJECTED") totalInterviews += count;
    }

    return { stats: { totalJobs, totalApplications, totalOffers, totalInterviews, totalHired } };
  } catch (error) {
    console.error("[getRecruiterAnalyticsAction] Analytics failure:", error);
    return { error: "Failed to compile aggregate platform metrics.", stats: null };
  }
}
/* ✅ Live notification feed built from real data — no schema change needed */
export async function getNotificationsAction() {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized", notifications: [], pendingInvites: 0 };

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [apps, interviews, pendingInvites] = await Promise.all([
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
    ]);

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

    return { notifications, pendingInvites };
  } catch (error) {
    console.error("[getNotificationsAction] failed:", error);
    return { error: "Failed to load notifications.", notifications: [], pendingInvites: 0 };
  }
}