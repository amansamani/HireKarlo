"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function getAllCandidatesAction() {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        applications: { some: { job: { userId } } }
      },
      include: {
        applications: {
          where: { job: { userId } },
          include: { job: { select: { title: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { candidates };
  } catch (error) {
    console.error("Failed to fetch global candidate pool:", error);
    return { error: "Failed to load candidate list." };
  }
}