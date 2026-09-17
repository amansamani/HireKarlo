"use server";
import { logError } from "@/lib/logger";

import { canEditPipeline } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";

export async function getJobsAction() {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) return { error: "Unauthorized", jobs: [] };

  try {
    const jobs = await prisma.job.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return { jobs };
  } catch (error) {
    logError("actions.jobs", error);
    return { error: "Failed to fetch jobs", jobs: [] };
  }
}