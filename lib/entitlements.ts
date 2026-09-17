import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { effectivePlan } from "@/lib/plans";

export async function lockOrganization(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, include: { subscription: true } });
  const plan = effectivePlan(org.subscription, org.trialEndsAt);
  if (!plan) throw new Error("Your trial or subscription has ended. Visit Billing to choose a plan.");
  return plan;
}

export async function reserveAiScore(organizationId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const plan = await lockOrganization(tx, organizationId);
    const period = plan.trial ? "trial" : new Date().toISOString().slice(0, 7);
    const usage = await tx.usageCounter.upsert({
      where: { organizationId_period: { organizationId, period } },
      create: { organizationId, period, aiScores: 0 }, update: {},
    });
    if (usage.aiScores >= plan.limits.aiScores) return false;
    await tx.usageCounter.update({ where: { organizationId_period: { organizationId, period } }, data: { aiScores: { increment: 1 } } });
    return true;
  });
}
