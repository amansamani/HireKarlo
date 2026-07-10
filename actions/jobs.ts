"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function getJobsAction() {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", jobs: [] };

  try {
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return { jobs };
  } catch (error) {
    return { error: "Failed to fetch jobs", jobs: [] };
  }
}