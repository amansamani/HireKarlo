"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getAllInterviewsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const interviews = await prisma.interview.findMany({
      where: {
        application: {
          job: { userId: session.user.id }
        }
      },
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