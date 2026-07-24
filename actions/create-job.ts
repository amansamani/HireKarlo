"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { revalidatePath } from "next/cache";

const CreateJobSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(100),
  department: z.string().trim().min(1, "Department is required").max(50),
  location: z.string().trim().min(1, "Location is required").max(100),
  type: z.string().trim().default("Full-time"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  interviewRounds: z.array(z.string().trim()).optional(),
});

export async function createJobAction(rawData: unknown) {
  const ctx = await requireOrg();
  if (!ctx) {
    return { error: "Unauthorized" };
  }
  if (!canEditPipeline(ctx.role)) {
    return { error: "Interviewers can't create job postings." };
  }

  const parsed = CreateJobSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Invalid data provided.";
    return { error: firstError };
  }

  const data = parsed.data;

  const interviewRounds = Array.from(
  new Set((data.interviewRounds ?? []).map((r) => r).filter(Boolean))
);

  try {
    console.error("[createJobAction] about to insert:", JSON.stringify({ ctx, data, interviewRounds }));
    const newJob = await prisma.job.create({
      data: {
        userId: ctx.userId,
        organizationId: ctx.organizationId,
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
    revalidatePath("/dashboard");
    
    return { success: "Job position created successfully!", jobId: newJob.id };
  } catch (error) {
    console.error("[createJobAction] Job creation error:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Failed to create job position: ${error.message}`
        : "Failed to create job position.";
    return { error: detail };
  }
}