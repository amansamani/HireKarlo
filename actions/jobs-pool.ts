"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getAllJobsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { userId: session.user.id },
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