"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function getRecruiterAnalyticsAction() {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const totalJobs = await prisma.job.count({ where: { userId } });
    const totalApplications = await prisma.jobApplication.count({ where: { job: { userId } } });
    const totalOffers = await prisma.jobApplication.count({
      where: { job: { userId }, stage: "OFFER" }
    });
    const totalInterviews = await prisma.jobApplication.count({
      where: { job: { userId }, stage: { in: ["TECHNICAL", "HR"] } }
    });

    return {
      stats: { totalJobs, totalApplications, totalOffers, totalInterviews }
    };
  } catch (error) {
    console.error("Analytics failure:", error);
    return { error: "Failed to compile aggregate platform metrics." };
  }
}