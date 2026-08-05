"use server";

import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";

const PAGE_SIZE = 20;

export async function getAllInterviewsAction(page: number = 1) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized", interviews: [], hasMore: false };

  try {
    const rows = await prisma.interview.findMany({
      where: { application: { job: { organizationId: ctx.organizationId } } },
      select: {
        id: true,
        round: true,
        interviewer: true,
        interviewerId: true,
        interviewerRating: true,
        meetingLink: true,
        scheduledAt: true,
        result: true,
        rating: true,
        feedback: true,
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
    return { interviews: rows.slice(0, PAGE_SIZE), hasMore };
  } catch (error) {
    console.error("Failed to fetch interviews pool:", error);
    return { error: "Failed to load interviews.", interviews: [], hasMore: false };
  }
}