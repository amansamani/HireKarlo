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
    // FIXED: Added console logging to use the error variable and satisfy the linter
    console.error("[getJobsAction] Database fetch failure:", error);
    return { error: "Failed to fetch jobs", jobs: [] };
  }
}