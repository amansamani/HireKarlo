"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline, canManageTeam } from "@/lib/roles";
import { lockOrganization } from "@/lib/entitlements";
import { recordAudit } from "@/lib/audit";

export async function editJobAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) redirect("/dashboard");
  const parsed = z.object({ id: z.string().min(1).max(100), title: z.string().trim().min(2).max(150), department: z.string().trim().min(1).max(100), location: z.string().trim().min(1).max(150), description: z.string().trim().min(10).max(20000), salaryRange: z.string().trim().max(150) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/dashboard/jobs?error=invalid");
  const { id, ...data } = parsed.data;
  try {
    await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      await tx.job.update({ where: { id, organizationId: ctx.organizationId }, data: { ...data, salaryRange: data.salaryRange || null } });
      await recordAudit(tx, ctx, "JOB_UPDATED", id);
    });
  } catch { redirect(`/dashboard/jobs/${encodeURIComponent(id)}/edit?error=save`); }
  revalidatePath(`/jobs/${id}`); revalidatePath("/dashboard/jobs"); revalidatePath(`/dashboard/jobs/${id}`);
  redirect(`/dashboard/jobs/${encodeURIComponent(id)}`);
}

export async function editCandidateAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) redirect("/dashboard");
  const parsed = z.object({ id: z.string().min(1).max(100), fullName: z.string().trim().min(2).max(120), phone: z.string().trim().max(50), currentCompany: z.string().trim().max(150), experience: z.coerce.number().int().min(0).max(100), skills: z.string().max(3000), notes: z.string().trim().max(10000) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/dashboard/candidates?error=invalid");
  const { id, skills, ...data } = parsed.data;
  try {
    await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      await tx.candidate.update({ where: { id, organizationId: ctx.organizationId }, data: { ...data, phone: data.phone || null, currentCompany: data.currentCompany || null, notes: data.notes || null, skills: [...new Set(skills.split(",").map(s => s.trim()).filter(Boolean))].slice(0, 100) } });
      await recordAudit(tx, ctx, "CANDIDATE_UPDATED", id);
    });
  } catch { redirect(`/dashboard/candidates/${encodeURIComponent(id)}?error=save`); }
  revalidatePath("/dashboard/candidates"); revalidatePath(`/dashboard/candidates/${id}`);
  redirect(`/dashboard/candidates/${encodeURIComponent(id)}?saved=1`);
}

export async function renameOrganizationAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || !canManageTeam(ctx.role)) redirect("/dashboard");
  const name = z.string().trim().min(2).max(150).safeParse(form.get("name"));
  if (!name.success) redirect("/dashboard/settings?error=invalid");
  try {
    await prisma.$transaction(async tx => {
      await tx.organization.update({ where: { id: ctx.organizationId }, data: { name: name.data } });
      await recordAudit(tx, ctx, "ORGANIZATION_RENAMED", ctx.organizationId);
    });
  } catch { redirect("/dashboard/settings?error=save"); }
  revalidatePath("/dashboard/settings"); redirect("/dashboard/settings?saved=1");
}
