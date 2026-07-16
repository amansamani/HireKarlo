"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";

export async function createJobAction(data: {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  interviewRounds?: string[];
}) {
  const userId = await requireAuth();
  if (!userId) {
    console.error("[createJobAction] no session/userId — auth() returned null. Check cookies/AUTH_SECRET.");
    return { error: "Unauthorized" };
  }

  if (!data.title || !data.department || !data.location) {
    console.error("[createJobAction] validation failed, payload:", data);
    return { error: "Please fill out all required fields." };
  }

  const interviewRounds = Array.from(
    new Set((data.interviewRounds ?? []).map((r) => r.trim()).filter(Boolean))
  );

  try {
    const newJob = await prisma.job.create({
      data: {
        userId,
        title: data.title,
        department: data.department,
        location: data.location,
        type: data.type,
        description: data.description,
        status: "OPEN",
        interviewRounds,
      },
    });

    revalidatePath("/dashboard/jobs");
    return { success: "Job position created successfully!", jobId: newJob.id };
  } catch (error) {
    console.error("Job creation error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Failed to create job position: ${error.message}`
        : "Failed to create job position.";
    return { error: detail };
  }
}