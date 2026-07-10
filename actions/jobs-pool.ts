"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function getAllJobsAction() {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const jobs = await prisma.job.findMany({
      where: { userId },
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return { jobs };
  } catch (error) {
    console.error("Failed to fetch jobs pool:", error);
    return { error: "Failed to load jobs list." };
  }
}