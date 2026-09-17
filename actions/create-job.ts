"use server";
import { logError } from "@/lib/logger";

import { lockOrganization } from "@/lib/entitlements";
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
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(20000),
  interviewRounds: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
  clientId: z.string().min(1).optional(),
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
    const newJob = await prisma.$transaction(async tx => {
      const plan = await lockOrganization(tx, ctx.organizationId);
      const jobs = await tx.job.count({ where: { organizationId: ctx.organizationId, status: "OPEN" } });
      if (jobs >= plan.limits.jobs) throw new Error("Active job limit reached. Visit Billing.");
      if (data.clientId) {
        const client = await tx.agencyClient.findFirst({ where: { id: data.clientId, organizationId: ctx.organizationId } });
        if (!client) throw new Error("Client not found");
      }
      return tx.job.create({
      data: {
        clientId: data.clientId,
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
    });

    revalidatePath("/dashboard/jobs");
    revalidatePath("/dashboard");
    
    return { success: "Job position created successfully!", jobId: newJob.id };
  } catch (error) {
    logError("actions.create-job", error);
    if (error instanceof Error && /limit reached|subscription has ended|Client not found/.test(error.message)) return { error: error.message };
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? `Failed to create job position: ${error.message}`
        : "Failed to create job position.";
    return { error: detail };
  }
}