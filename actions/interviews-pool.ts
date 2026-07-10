"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function getAllInterviewsAction() {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const interviews = await prisma.interview.findMany({
      where: { application: { job: { userId } } },
      include: {
        application: {
          include: {
            candidate: { select: { fullName: true, email: true } },
            job: { select: { title: true } }
          }
        }
      },
      orderBy: { scheduledAt: "asc" }
    });

    return { interviews };
  } catch (error) {
    console.error("Failed to fetch interviews pool:", error);
    return { error: "Failed to load interviews list." };
  }
}