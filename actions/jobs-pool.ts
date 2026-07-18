"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client"; // Import Prisma namespace for error instances

const PAGE_SIZE = 20;

export async function getAllJobsAction(
  page: number = 1,
  search: string = "",
  statusFilter?: "OPEN" | "CLOSED" | "FILLED"
) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", jobs: [], hasMore: false };

  const trimmed = search.trim();

  try {
    const where: Prisma.JobWhereInput = {
      userId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(trimmed
        ? {
            OR: [
              { title: { contains: trimmed, mode: "insensitive" } },
              { department: { contains: trimmed, mode: "insensitive" } },
              { location: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    
    const rows = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        type: true,
        status: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });

    const hasMore = rows.length > PAGE_SIZE;
    return { jobs: rows.slice(0, PAGE_SIZE), hasMore };
  } catch (error) {
    console.error("Failed to fetch jobs pool:", error);
    return { error: "Failed to load jobs list.", jobs: [], hasMore: false };
  }
}

export async function updateJobStatusAction(jobId: string, status: "OPEN" | "CLOSED" | "FILLED") {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    await prisma.job.update({
      where: { id: jobId, userId },
      data: { status },
    });

    revalidatePath("/dashboard/jobs");
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: true };
  } catch (error) {
    // Catch the specific Prisma error when the record doesn't exist or userId doesn't match
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Job not found or unauthorized" };
    }
    
    console.error("Failed to update job status:", error);
    return { error: "Failed to update job status" };
  }
}

export async function deleteJobAction(jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const deletedJob = await prisma.job.delete({
      where: { id: jobId, userId },
      select: { title: true }, 
    });

    revalidatePath("/dashboard/jobs");
    return { success: `"${deletedJob.title}" deleted.` };
  } catch (error) {
    // Catch the specific Prisma error when the record doesn't exist or userId doesn't match
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Job not found or unauthorized" };
    }

    console.error("Failed to delete job:", error);
    return { error: "Failed to delete job." };
  }
}