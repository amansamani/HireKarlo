"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

const PAGE_SIZE = 25;

export async function getAllInterviewsAction(page: number = 1) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", interviews: [], hasMore: false };

  try {
    const rows = await prisma.interview.findMany({
      where: { application: { job: { userId } } },
      select: {
        id: true,
        round: true,
        interviewer: true,
        scheduledAt: true,
        result: true,
        rating: true,
        feedback: true,
        application: {
          select: {
            job: { select: { title: true } },
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
    return { error: "Failed to load interviews list.", interviews: [], hasMore: false };
  }
}