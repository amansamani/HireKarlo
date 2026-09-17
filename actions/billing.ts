"use server";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { appUrl, priceId, stripeRequest } from "@/lib/billing-provider";
import { isPlanId, PLANS } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";

export async function checkoutAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  let url: string;
  try {
    const plan = String(form.get("plan"));
    const currency = String(form.get("currency"));
    if (!isPlanId(plan) || (currency !== "INR" && currency !== "USD")) throw new Error("Invalid plan");
    if (!(await allowRequest(`checkout:${ctx.organizationId}`, 5, 600_000))) throw new Error("Too many requests");
    // One organization lock also prevents parallel checkouts from provisioning
    // multiple active subscriptions. Idempotency persists across server restarts.
    url = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
      const existing = await tx.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
      if (existing && existing.status !== "canceled") throw new Error("Manage your existing plan using the billing portal");
      const pending = await tx.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
      if (pending && pending.expiresAt > new Date()) return pending.url;
      const price = priceId(plan, currency);
      const remotePrice = await stripeRequest(`prices/${encodeURIComponent(price)}`);
      if (!remotePrice.active || remotePrice.currency !== currency.toLowerCase() || remotePrice.unit_amount !== PLANS[plan][currency === "INR" ? "inr" : "usd"] * 100 || remotePrice.recurring?.interval !== "month" || remotePrice.recurring?.interval_count !== 1) throw new Error("Price configuration does not match the displayed plan");
      const user = await tx.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { email: true } });
      const params = new URLSearchParams({ mode: "subscription", "line_items[0][price]": price, "line_items[0][quantity]": "1", success_url: `${appUrl()}/dashboard/billing?checkout=complete`, cancel_url: `${appUrl()}/dashboard/billing`, "subscription_data[metadata][organizationId]": ctx.organizationId, "metadata[organizationId]": ctx.organizationId, billing_address_collection: "required", "tax_id_collection[enabled]": "true", expires_at: String(Math.floor(Date.now() / 1000) + 1800) });
      if (existing) params.set("customer", existing.providerCustomerId);
      else params.set("customer_email", user.email);
      if (process.env.STRIPE_AUTOMATIC_TAX === "true") params.set("automatic_tax[enabled]", "true");
      const key = `checkout:${ctx.organizationId}:${plan}:${currency}:${Math.floor(Date.now() / 1_800_000)}`;
      const session = await stripeRequest("checkout/sessions", params, key);
      if (typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) throw new Error("Invalid billing URL");
      await tx.billingCheckout.upsert({ where: { organizationId: ctx.organizationId }, create: { organizationId: ctx.organizationId, providerSessionId: session.id, url: session.url, expiresAt: new Date(session.expires_at * 1000) }, update: { providerSessionId: session.id, url: session.url, expiresAt: new Date(session.expires_at * 1000) } });
      return session.url;
    }, { timeout: 40_000 });
  } catch (error) {
    console.error("[checkout]", error instanceof Error ? error.message : "Provider error");
    redirect("/dashboard/billing?error=checkout");
  }
  redirect(url);
}

export async function billingPortalAction() {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  let url: string;
  try {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
    if (!subscription) throw new Error("No subscription");
    if (!(await allowRequest(`portal:${ctx.organizationId}`, 10, 600_000))) throw new Error("Too many requests");
    const result = await stripeRequest("billing_portal/sessions", new URLSearchParams({ customer: subscription.providerCustomerId, return_url: `${appUrl()}/dashboard/billing` }));
    if (typeof result.url !== "string" || !result.url.startsWith("https://billing.stripe.com/")) throw new Error("Invalid portal URL");
    url = result.url;
  } catch { redirect("/dashboard/billing?error=portal"); }
  redirect(url);
}
