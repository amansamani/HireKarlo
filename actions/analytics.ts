"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getRecruiterAnalyticsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const totalJobs = await prisma.job.count({
      where: { userId: session.user.id }
    });

    const totalApplications = await prisma.jobApplication.count({
      where: {
        job: { userId: session.user.id }
      }
    });

    const totalOffers = await prisma.jobApplication.count({
      where: {
        job: { userId: session.user.id },
        stage: "OFFER"
      }
    });

    const totalInterviews = await prisma.jobApplication.count({
      where: {
        job: { userId: session.user.id },
        stage: { in: ["TECHNICAL", "HR"] }
      }
    });

    return {
      stats: {
        totalJobs,
        totalApplications,
        totalOffers,
        totalInterviews
      }
    };
  } catch (error) {
    console.error("Analytics failure:", error);
    return { error: "Failed to compile aggregate platform metrics." };
  }
}