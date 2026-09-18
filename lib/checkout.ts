import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { appUrl, priceId, stripeRequest } from "@/lib/billing-provider";
import { PLANS, type PlanId } from "@/lib/plans";
import { recordAudit } from "@/lib/audit";

export class CheckoutError extends Error {
  constructor(public code: "pending" | "existing" | "review" | "unavailable") { super(code); }
}
type Context = { organizationId: string; userId: string };

// Commit exact parameters and identity before any provider call. Retried remote
// success/local failure then uses the same body/key across process restarts.
export async function prepareCheckout(ctx: Context, plan: PlanId, currency: "INR" | "USD") {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
    const subscription = await tx.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
    if (subscription && subscription.provider !== "stripe") throw new CheckoutError("review");
    if (subscription && subscription.status !== "canceled") throw new CheckoutError("existing");
    const pending = await tx.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
    if (pending) {
      if (pending.provider !== "stripe") throw new CheckoutError("pending");
      if (pending.plan !== plan || pending.currency !== currency) throw new CheckoutError("pending");
      if (!pending.requestBody || !pending.idempotencyKey || pending.expiresAt <= new Date()) throw new CheckoutError("review");
      return pending;
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { email: true } });
    const intentId = randomUUID();
    const params = new URLSearchParams({ mode: "subscription", "line_items[0][price]": priceId(plan, currency), "line_items[0][quantity]": "1", success_url: `${appUrl()}/dashboard/billing?checkout=complete`, cancel_url: `${appUrl()}/dashboard/billing`, "subscription_data[metadata][organizationId]": ctx.organizationId, "metadata[organizationId]": ctx.organizationId, client_reference_id: intentId, billing_address_collection: "required", "tax_id_collection[enabled]": "true" });
    if (subscription) params.set("customer", subscription.providerCustomerId);
    else params.set("customer_email", user.email);
    if (process.env.STRIPE_AUTOMATIC_TAX === "true") params.set("automatic_tax[enabled]", "true");
    const intent = await tx.billingCheckout.create({ data: { organizationId: ctx.organizationId, providerSessionId: `intent_${intentId}`, url: "", plan, currency, idempotencyKey: `hirekarlo-checkout:${intentId}`, requestBody: params.toString(), expiresAt: new Date(Date.now() + 23 * 3600_000) } });
    await recordAudit(tx, ctx, "BILLING_CHECKOUT_REQUESTED", intentId);
    return intent;
  });
}

export async function openCheckout(ctx: Context, plan: PlanId, currency: "INR" | "USD") {
  const intent = await prepareCheckout(ctx, plan, currency);
  const params = new URLSearchParams(intent.requestBody!);
  const price = await stripeRequest(`prices/${encodeURIComponent(params.get("line_items[0][price]")!)}`);
  if (!price.active || price.currency !== currency.toLowerCase() || price.unit_amount !== PLANS[plan][currency === "INR" ? "inr" : "usd"] * 100 || price.recurring?.interval !== "month" || price.recurring?.interval_count !== 1) throw new CheckoutError("unavailable");
  const session = intent.providerSessionId.startsWith("cs_")
    ? await stripeRequest(`checkout/sessions/${encodeURIComponent(intent.providerSessionId)}`)
    : await stripeRequest("checkout/sessions", params, intent.idempotencyKey!);
  if (session.status !== "open") throw new CheckoutError("review");
  if (typeof session.id !== "string" || !session.id.startsWith("cs_") || typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) throw new CheckoutError("unavailable");
  await prisma.billingCheckout.updateMany({ where: { organizationId: ctx.organizationId, idempotencyKey: intent.idempotencyKey }, data: { providerSessionId: session.id, url: session.url } });
  return session.url as string;
}

export async function abandonCheckout(ctx: Context) {
  const intent = await prisma.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
  if (!intent) return;
  if (intent.provider !== "stripe") throw new CheckoutError("review");
  let session;
  if (intent.providerSessionId.startsWith("cs_")) session = await stripeRequest(`checkout/sessions/${encodeURIComponent(intent.providerSessionId)}`);
  else {
    // Beyond Stripe's conservative idempotency window, reconcile manually;
    // never guess whether a lost response created a payable session.
    if (!intent.requestBody || !intent.idempotencyKey || intent.expiresAt <= new Date()) throw new CheckoutError("review");
    session = await stripeRequest("checkout/sessions", new URLSearchParams(intent.requestBody), intent.idempotencyKey);
  }
  if (session.status === "open") session = await stripeRequest(`checkout/sessions/${encodeURIComponent(session.id)}/expire`, new URLSearchParams());
  if (session.status !== "expired") throw new CheckoutError("review");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
    await tx.billingCheckout.deleteMany({ where: { organizationId: ctx.organizationId, providerSessionId: intent.providerSessionId, idempotencyKey: intent.idempotencyKey } });
    await recordAudit(tx, ctx, "BILLING_CHECKOUT_EXPIRED", session.id);
  });
}
