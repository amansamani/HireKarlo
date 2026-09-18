import "server-only";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { RazorpayAgreement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CheckoutError } from "@/lib/checkout";
import { PLANS, type PlanId } from "@/lib/plans";
import { recordAudit } from "@/lib/audit";
import { razorpayConfigured } from "@/lib/billing-config";
import { RazorpayError, RazorpaySubscriptionSchema, razorpayRequest, razorpayCredentials, safeRazorpayUrl, validatedRazorpayPlan, type RazorpaySubscription } from "@/lib/razorpay";

type Context = { organizationId: string; userId: string };
export function assertAgreement(remote: RazorpaySubscription, agreement: RazorpayAgreement) {
  if (agreement.keyId !== razorpayCredentials().keyId || remote.notes.organizationId !== agreement.organizationId || remote.notes.hirekarloIntentId !== agreement.id || remote.plan_id !== agreement.providerPlanId || remote.quantity !== 1 || (agreement.providerSubscriptionId && remote.id !== agreement.providerSubscriptionId)) throw new Error("Subscription ownership or plan mismatch");
}

export async function recoverRazorpayAgreement(agreement: RazorpayAgreement) {
  if (agreement.keyId !== razorpayCredentials().keyId) throw new CheckoutError("review");
  if (agreement.providerSubscriptionId) {
    const remote = RazorpaySubscriptionSchema.parse(await razorpayRequest(`subscriptions/${agreement.providerSubscriptionId}`));
    assertAgreement(remote, agreement); return remote;
  }
  // No subscription-create idempotency guarantee: never blindly retry a POST.
  // Recover a lost response by finding our persisted intent in provider notes.
  const matches: RazorpaySubscription[] = [];
  for (let page = 0; page < 2; page++) {
    const from = Math.floor(agreement.createdAt.getTime() / 1000) - 60;
    const result = z.object({ items: z.array(z.unknown()) }).parse(await razorpayRequest(`subscriptions?from=${from}&count=100&skip=${page * 100}`));
    for (const item of result.items) {
      const parsed = RazorpaySubscriptionSchema.safeParse(item);
      if (parsed.success && parsed.data.notes.hirekarloIntentId === agreement.id) matches.push(parsed.data);
    }
    if (result.items.length < 100) break;
    if (page === 1) throw new CheckoutError("review");
  }
  if (matches.length !== 1) throw new CheckoutError("review");
  assertAgreement(matches[0], agreement);
  await prisma.razorpayAgreement.update({ where: { id: agreement.id }, data: { providerSubscriptionId: matches[0].id } });
  return matches[0];
}

export async function openRazorpayCheckout(ctx: Context, plan: PlanId, currency: string) {
  if (currency !== "INR" || !razorpayConfigured(plan)) throw new CheckoutError("unavailable");
  const providerPlanId = await validatedRazorpayPlan(plan);
  const intent = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
    const existing = await tx.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
    if (existing && existing.provider !== "razorpay") throw new CheckoutError("review");
    if (existing && existing.status !== "canceled") throw new CheckoutError("existing");
    const pending = await tx.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
    if (pending) {
      if (pending.provider !== "razorpay" || pending.plan !== plan || pending.currency !== currency) throw new CheckoutError("pending");
      if (!pending.idempotencyKey) throw new CheckoutError("review");
      return pending;
    }
    const id = randomUUID(), expiresAt = new Date(Date.now() + 24 * 3600_000);
    await tx.razorpayAgreement.create({ data: { id, organizationId: ctx.organizationId, plan, providerPlanId, keyId: razorpayCredentials().keyId, amount: PLANS[plan].inr * 100 } });
    const body = { plan_id: providerPlanId, total_count: 120, quantity: 1, customer_notify: 0, expire_by: Math.floor(expiresAt.getTime() / 1000), notes: { organizationId: ctx.organizationId, hirekarloIntentId: id } };
    await recordAudit(tx, ctx, "RAZORPAY_CHECKOUT_REQUESTED", id);
    return tx.billingCheckout.create({ data: { organizationId: ctx.organizationId, provider: "razorpay", providerSessionId: `intent_${id}`, idempotencyKey: id, requestBody: JSON.stringify(body), url: "", plan, currency, expiresAt } });
  });
  const agreement = await prisma.razorpayAgreement.findUniqueOrThrow({ where: { id: intent.idempotencyKey! } });
  if (agreement.keyId !== razorpayCredentials().keyId) throw new CheckoutError("review");
  const claimed = await prisma.razorpayAgreement.updateMany({ where: { id: agreement.id, creationAttemptedAt: null, providerSubscriptionId: null }, data: { creationAttemptedAt: new Date() } });
  let remote: RazorpaySubscription;
  if (claimed.count) {
    try {
      remote = RazorpaySubscriptionSchema.parse(await razorpayRequest("subscriptions", JSON.parse(intent.requestBody!)));
      assertAgreement(remote, agreement);
      await prisma.razorpayAgreement.update({ where: { id: agreement.id }, data: { providerSubscriptionId: remote.id } });
    } catch (error) {
      if (error instanceof RazorpayError && error.definitiveRejection) {
        await prisma.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
          await tx.billingCheckout.deleteMany({ where: { organizationId: ctx.organizationId, provider: "razorpay", idempotencyKey: agreement.id } });
          await tx.razorpayAgreement.update({ where: { id: agreement.id }, data: { status: "rejected", nextSyncAt: new Date("2100-01-01") } });
        });
        throw new CheckoutError("unavailable");
      }
      throw new CheckoutError("review");
    }
  } else remote = await recoverRazorpayAgreement(agreement);
  if (!["created", "authenticated"].includes(remote.status)) throw new CheckoutError("review");
  const url = safeRazorpayUrl(remote.short_url);
  await prisma.billingCheckout.updateMany({ where: { organizationId: ctx.organizationId, provider: "razorpay", idempotencyKey: agreement.id }, data: { providerSessionId: remote.id, url } });
  return url;
}

export async function abandonRazorpayCheckout(ctx: Context) {
  const intent = await prisma.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
  if (!intent) return;
  if (intent.provider !== "razorpay" || !intent.idempotencyKey) throw new CheckoutError("review");
  const agreement = await prisma.razorpayAgreement.findUniqueOrThrow({ where: { id: intent.idempotencyKey } });
  let remote = await recoverRazorpayAgreement(agreement);
  if (["created", "authenticated"].includes(remote.status) && remote.paid_count === 0) {
    await razorpayRequest(`subscriptions/${remote.id}/cancel`, { cancel_at_cycle_end: 0 });
    remote = RazorpaySubscriptionSchema.parse(await razorpayRequest(`subscriptions/${remote.id}`));
    assertAgreement(remote, agreement);
  }
  if (!["cancelled", "expired"].includes(remote.status) || remote.paid_count !== 0) throw new CheckoutError("review");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
    await tx.billingCheckout.deleteMany({ where: { organizationId: ctx.organizationId, provider: "razorpay", idempotencyKey: agreement.id } });
    await tx.razorpayAgreement.update({ where: { id: agreement.id }, data: { status: remote.status, nextSyncAt: new Date(Date.now() + 86400_000) } });
    await recordAudit(tx, ctx, "RAZORPAY_UNPAID_CHECKOUT_CANCELLED", remote.id);
  });
}
