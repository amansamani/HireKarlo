"use server";

import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

export async function getAllJobsAction(
  page: number = 1,
  search: string = "",
  statusFilter?: "OPEN" | "CLOSED" | "FILLED"
) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized", jobs: [], hasMore: false };

  const trimmed = search.trim();

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
    console.error("Failed to fetch jobs pool:", error);
    return { error: "Failed to load jobs list.", jobs: [], hasMore: false };
  }
}

export async function updateJobStatusAction(jobId: string, status: "OPEN" | "CLOSED" | "FILLED") {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't change job status." };

  try {
    await prisma.job.update({
      where: { id: jobId, organizationId: ctx.organizationId },
      data: { status },
    });
    revalidatePath("/dashboard/jobs");
    return { success: "Status updated." };
  } catch (error) {
    console.error("[updateJobStatusAction] failed — record doesn't exist or organizationId doesn't match:", error);
    return { error: "Failed to update job status." };
  }
}

export async function deleteJobAction(jobId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canEditPipeline(ctx.role)) return { error: "Interviewers can't delete jobs." };

  try {
    await prisma.job.delete({
      where: { id: jobId, organizationId: ctx.organizationId },
    });
    revalidatePath("/dashboard/jobs");
    revalidatePath("/dashboard");
    return { success: "Job deleted." };
  } catch (error) {
    console.error("[deleteJobAction] failed — record doesn't exist or organizationId doesn't match:", error);
    return { error: "Failed to delete job." };
  }
}