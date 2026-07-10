"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getJobApplicantsAction(jobId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", applications: [] };
  }

  try {
    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        candidate: true 
    },
      orderBy: { createdAt: "desc" },
    });
    return { applications };
  } catch (error) {
    console.error("Fetch error detail:", error);
    return { error: "Failed to fetch applicants", applications: [], activityLogs: [] };
  }
}

export async function updateApplicationStatusAction(applicationId: string, status: string, jobId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { candidate: true }
    });

    if (!currentApp) return { error: "Application not found" };

    await (prisma.jobApplication.update as any)({
      where: { id: applicationId },
      data: { stage: status },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        applicationId: applicationId,
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