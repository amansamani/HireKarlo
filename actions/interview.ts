"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { interviewScheduledEmail } from "@/lib/email-templates";

export async function scheduleInterviewAction(data: {
  applicationId: string;
  round: string;
  interviewer: string;
  scheduledAt: string;
  jobId: string;
}) {
  const userId = await requireAuth();
  if (!userId) return { error: "Unauthorized" };

  try {

    const currentApp = await prisma.jobApplication.findUnique({
      where: { id: data.applicationId },
      include: { candidate: true, job: true }
    });

    if (!currentApp) return { error: "Application not found." };
    if (currentApp.job.userId !== userId) return { error: "Unauthorized" };

    await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        round: data.round,
        interviewer: data.interviewer,
        scheduledAt: new Date(data.scheduledAt),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        applicationId: data.applicationId,
        action: "Interview Scheduled",
        details: `${data.round} scheduled for ${currentApp.candidate.fullName} with ${data.interviewer}`,
      },
    });

    const { subject, html } = interviewScheduledEmail(
      currentApp.candidate.fullName,
      currentApp.job.title,
      data.round,
      data.interviewer,
      new Date(data.scheduledAt)
    );
    try {
      await sendEmail(currentApp.candidate.email, subject, html);
    } catch (emailError) {
      console.error("[scheduleInterviewAction] interview scheduled OK but notification email failed:", emailError);
    }

    revalidatePath(`/dashboard/jobs/${data.jobId}`);
    return { success: "Interview scheduled successfully!" };
  } catch (error) {
    console.error("Scheduling error:", error);
    return { error: "Failed to schedule interview." };
  }
}