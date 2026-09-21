"use server";
import { logError } from "@/lib/logger";

import { canEditPipeline } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";

const PAGE_SIZE = 20;

export async function getAllInterviewsAction(page: number = 1) {
  page = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const ctx = await requireOrg();
  if (!ctx || (!canEditPipeline(ctx.role) && ctx.role !== "INTERVIEWER")) return { error: "Unauthorized", interviews: [], hasMore: false };

  try {
    const rows = await prisma.interview.findMany({
      where: { application: { job: { organizationId: ctx.organizationId } }, ...(ctx.role === "INTERVIEWER" ? { interviewerId: ctx.userId } : {}) },
      select: {
        id: true,
        round: true,
        interviewer: true,
        interviewerId: true,
        interviewerRating: true,
        candidateExperienceRating: true,
        meetingLink: true,
        scheduledAt: true,
        result: true,
        rating: true,
        feedback: true,
        reviewStatus: true,
        reviewNote: true,
        application: {
          select: {
            job: { select: { id: true, title: true } },
            candidate: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });

    const hasMore = rows.length > PAGE_SIZE;
    return { interviews: rows.slice(0, PAGE_SIZE).map(row => ctx.role === "INTERVIEWER" ? { ...row, interviewerRating: null, candidateExperienceRating: null, reviewNote: null } : row), hasMore };
  } catch (error) {
    logError("actions.interviews-pool", error);
    return { error: "Failed to load interviews.", interviews: [], hasMore: false };
  }
}