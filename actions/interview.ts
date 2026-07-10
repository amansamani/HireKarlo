"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function scheduleInterviewAction(data: {
  applicationId: string;
  round: string;
  interviewer: string;
  scheduledAt: string;
  jobId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // 1. Create the Interview entry
    const interview = await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        round: data.round,
        interviewer: data.interviewer,
        scheduledAt: new Date(data.scheduledAt),
      },
    });

    // 2. Automatically log this into our new Activity Feed
    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true }
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        applicationId: data.applicationId,
        action: "Interview Scheduled",
        details: `${data.round} scheduled for ${currentApp?.candidate.fullName} with ${data.interviewer}`,
      },
    });

    revalidatePath(`/dashboard/jobs/${data.jobId}`);
    return { success: "Interview scheduled successfully!" };
  } catch (error) {
    console.error("Scheduling error:", error);
    return { error: "Failed to schedule interview." };
  }
}