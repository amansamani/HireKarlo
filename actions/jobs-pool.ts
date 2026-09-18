"use server";
import { recordAudit } from "@/lib/audit";
import { logError } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { lockOrganization } from "@/lib/entitlements";

const PAGE_SIZE = 20;

export async function getAllJobsAction(
  page: number = 1,
  search: string = "",
  statusFilter?: "OPEN" | "CLOSED" | "FILLED"
) {
  page = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized", jobs: [], hasMore: false };

  if (!canEditPipeline(ctx.role)) return { error: "Unauthorized", jobs: [], hasMore: false };
  const trimmed = search.trim().slice(0, 200);

  try {
    const where: Prisma.JobWhereInput = {
      organizationId: ctx.organizationId,
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
    return { jobs: rows.slice(0, PAGE_SIZE), hasMore, canCreateJob: canEditPipeline(ctx.role) };
  } catch (error) {
    logError("actions.jobs-pool", error);
    return { error: "Failed to load jobs list.", jobs: [], hasMore: false };
  }
}

export async function updateJobStatusAction(jobId: string, status: "OPEN" | "CLOSED" | "FILLED") {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't change job status." };

  if (!["OPEN", "CLOSED", "FILLED"].includes(status)) return { error: "Invalid job status." };
  try {
    await prisma.$transaction(async tx => {
    // Closing a role remains available after expiry, so customers can stop intake.
    const plan = status === "OPEN" ? await lockOrganization(tx, ctx.organizationId) : null;
    if (!plan) await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
    const job = await tx.job.findFirst({ where: { id: jobId, organizationId: ctx.organizationId } });
    if (!job) throw new Error("Job not found");
    if (job.status === status) return;
    if (status === "OPEN" && job.status !== "OPEN") {
      const active = await tx.job.count({ where: { organizationId: ctx.organizationId, status: "OPEN" } });
      if (plan && active >= plan.limits.jobs) throw new Error("Active job limit reached");
    }
    await tx.job.update({
      where: { id: jobId, organizationId: ctx.organizationId },
      data: { status },
    });
    await recordAudit(tx, ctx, `JOB_STATUS_${status}`, jobId);
    });
    revalidatePath("/dashboard/jobs"); revalidatePath(`/jobs/${jobId}`); revalidatePath("/dashboard");
    return { success: "Status updated." };
  } catch (error) {
    logError("actions.jobs-pool", error);
    return { error: "Failed to update job status." };
  }
}

export async function deleteJobAction(jobId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't delete jobs." };

  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
      await tx.job.update({ where: { id: jobId, organizationId: ctx.organizationId }, data: { status: "CLOSED" } });
      await recordAudit(tx, ctx, "JOB_ARCHIVED", jobId);
    });
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/dashboard/jobs");
    revalidatePath("/dashboard");
    return { success: "Job archived. Applications and audit history are retained." };
  } catch (error) {
    logError("actions.jobs-pool", error);
    return { error: "Failed to delete job." };
  }
}
