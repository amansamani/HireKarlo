"use server";
import { recordAudit } from "@/lib/audit";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function switchOrganizationAction(form: FormData) {
  const userId = await requireAuth();
  const organizationId = String(form.get("organizationId") ?? "");
  if (!userId) throw new Error("Unauthorized");
  const membership = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
  if (!membership) throw new Error("Organization not found");
  await recordAudit(prisma, { organizationId, userId }, "WORKSPACE_SELECTED", organizationId);
  (await cookies()).set("hirekarlo-organization", organizationId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/dashboard", "layout");
}
