"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getAllCandidatesAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        applications: {
          include: {
            job: {
              select: { title: true }
            }
          }
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