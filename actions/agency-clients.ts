"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { lockOrganization } from "@/lib/entitlements";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createAgencyClientAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) redirect("/dashboard/clients?error=unauthorized");
  const input = z.object({ name: z.string().trim().min(2).max(150), contactEmail: z.union([z.literal(""), z.string().trim().email()]), notes: z.string().trim().max(3000) }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/dashboard/clients?error=invalid");
  try {
    await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      if (await tx.agencyClient.count({ where: { organizationId: ctx.organizationId } }) >= 500) throw new Error("Client limit reached");
      await tx.agencyClient.create({ data: { organizationId: ctx.organizationId, name: input.data.name, contactEmail: input.data.contactEmail || null, notes: input.data.notes || null } });
    });
  } catch { redirect("/dashboard/clients?error=create"); }
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?created=1");
}

export async function getAgencyClientsAction() {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) return { clients: [] };
  return { clients: await prisma.agencyClient.findMany({ where: { organizationId: ctx.organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }) };
}

export async function assignJobClientAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) redirect("/dashboard/clients?error=unauthorized");
  const jobId = String(form.get("jobId") ?? "");
  const clientId = String(form.get("clientId") ?? "");
  try {
    await prisma.$transaction(async tx => {
      await lockOrganization(tx, ctx.organizationId);
      if (clientId && !(await tx.agencyClient.findFirst({ where: { id: clientId, organizationId: ctx.organizationId } }))) throw new Error("Client not found");
      await tx.job.update({ where: { id: jobId, organizationId: ctx.organizationId }, data: { clientId: clientId || null } });
    });
  } catch { redirect("/dashboard/clients?error=assign"); }
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients?assigned=1");
}
