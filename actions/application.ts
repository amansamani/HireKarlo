"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";

export async function getJobApplicantsAction(jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized", applications: [] };

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      return { error: "Unauthorized", applications: [] };
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      include: { candidate: true },
      orderBy: { createdAt: "desc" },
    });
    return { applications };
  } catch (error) {
    console.error("Fetch error detail:", error);
    return { error: "Failed to fetch applicants", applications: [], activityLogs: [] };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string, jobId: string) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true }
    });

    if (!currentApp) return { error: "Application not found" };

    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { stage: status as any },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        applicationId,
        action: `Moved to ${status}`,
        details: `${currentApp.candidate.fullName} shifted from ${currentApp.stage} to ${status}`
      }
    });

    revalidatePath(`/dashboard/jobs/${jobId}`);
    return { success: `Candidate moved to ${status}` };
  } catch (error) {
    console.error("Update error detail:", error);
    return { error: "Failed to update pipeline stage" };
  }
}