"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";

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

export async function updateJobStatusAction(jobId: string, status: "OPEN" | "CLOSED" | "FILLED") {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      return { error: "Job not found" };
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { status },
    });

    revalidatePath("/dashboard/jobs");
    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update job status:", error);
    return { error: "Failed to update job status" };
  }
}

export async function deleteJobAction(jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      return { error: "Job not found" };
    }

    // Cascades per schema: JobApplication rows (and their Interviews) for this
    // job are deleted along with it; ActivityLog rows have their applicationId
    // set to null instead of being deleted, so audit history is preserved.
    await prisma.job.delete({ where: { id: jobId } });

    revalidatePath("/dashboard/jobs");
    return { success: `"${job.title}" deleted.` };
  } catch (error) {
    console.error("Failed to delete job:", error);
    return { error: "Failed to delete job." };
  }
}