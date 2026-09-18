import { logError } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { planForPrice, stripeRequest, validWebhookSignature } from "@/lib/billing-provider";
import { readBoundedBody } from "@/lib/bounded-body";

const EventSchema = z.object({ id: z.string().startsWith("evt_"), type: z.string(), data: z.object({ object: z.object({ id: z.string(), metadata: z.record(z.string(), z.string()).optional() }) }) });
const SubscriptionSchema = z.object({ id: z.string().startsWith("sub_"), customer: z.string().startsWith("cus_"), status: z.string(), metadata: z.object({ organizationId: z.string().min(1) }), items: z.object({ data: z.array(z.object({ current_period_end: z.number().int(), price: z.object({ id: z.string(), currency: z.string() }) })).length(1) }) });

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new NextResponse("Billing unavailable", { status: 503 });
  if (Number(request.headers.get("content-length")) > 1_000_000) return new NextResponse("Too large", { status: 413 });
  let body: string;
  try { body = new TextDecoder().decode(await readBoundedBody(request, 1_000_000)); }
  catch { return new NextResponse("Invalid or oversized body", { status: 413 }); }
  if (body.length > 1_000_000) return new NextResponse("Too large", { status: 413 });
  if (!validWebhookSignature(body, request.headers.get("stripe-signature"), secret)) return new NextResponse("Invalid signature", { status: 400 });
  let event;
  try { event = EventSchema.parse(JSON.parse(body)); } catch { return new NextResponse("Invalid event", { status: 400 }); }
  if (!["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) return NextResponse.json({ received: true });
  try {
    const orgId = event.data.object.metadata?.organizationId;
    if (!orgId) return NextResponse.json({ received: true }); // Another product in this account.
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${orgId} FOR UPDATE`;
      if (await tx.billingEvent.findUnique({ where: { id: event.id } })) return;
      // Always fetch canonical current state *after* acquiring the tenant lock:
      // delayed and out-of-order events cannot overwrite newer state.
      const subscription = SubscriptionSchema.parse(await stripeRequest(`subscriptions/${encodeURIComponent(event.data.object.id)}`));
      if (subscription.metadata.organizationId !== orgId) throw new Error("Organization mismatch");
      const item = subscription.items.data[0];
      const mapping = planForPrice(item.price.id);
      if (!mapping || item.price.currency !== mapping.currency.toLowerCase()) throw new Error("Unknown subscription price");
      const existing = await tx.subscription.findUnique({ where: { organizationId: orgId } });
      if (existing?.provider === "razorpay") throw new Error("Different billing provider: requires operator review");
      if (existing && existing.providerSubscriptionId !== subscription.id && subscription.status === "canceled") {
        await tx.billingEvent.create({ data: { id: event.id } });
        return;
      }
      if (existing && existing.providerSubscriptionId !== subscription.id && existing.status !== "canceled") throw new Error("Conflicting subscription: requires operator review");
      const data = { providerCustomerId: subscription.customer, providerSubscriptionId: subscription.id, plan: mapping.plan, status: subscription.status, currency: mapping.currency, currentPeriodEnd: new Date(item.current_period_end * 1000) };
      await tx.subscription.upsert({ where: { organizationId: orgId }, create: { organizationId: orgId, ...data }, update: data });
      await tx.billingCheckout.deleteMany({ where: { organizationId: orgId, provider: "stripe" } });
      await tx.billingEvent.create({ data: { id: event.id } });
    }, { timeout: 25_000 });
    return NextResponse.json({ received: true });
  } catch (error) {
    logError("app.api.billing.webhook.route", error);
    return new NextResponse("Retry later", { status: 500 });
  }
}
