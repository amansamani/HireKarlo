import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPlanId } from "@/lib/plans";
import { recordAudit } from "@/lib/audit";
import { assertAgreement, recoverRazorpayAgreement } from "@/lib/razorpay-checkout";
import { RazorpaySubscriptionSchema, RazorpayInvoiceSchema, RazorpayPaymentSchema, razorpayRequest } from "@/lib/razorpay";

const terminal = new Set(["cancelled", "completed", "expired"]);
type Invoice = z.infer<typeof RazorpayInvoiceSchema>;

async function fetchInvoices(subscriptionId: string) {
  const invoices: Invoice[] = [];
  for (let page = 0; page < 3; page++) {
    const result = z.object({ items: z.array(RazorpayInvoiceSchema) }).parse(await razorpayRequest(`invoices?subscription_id=${subscriptionId}&count=100&skip=${page * 100}`));
    invoices.push(...result.items);
    if (result.items.length < 100) return invoices;
  }
  throw new Error("Invoice history requires operator review");
}

async function recordPayment(tx: Prisma.TransactionClient, organizationId: string, subscriptionId: string, invoice: Invoice) {
  if (!invoice.payment_id) return null;
  const payment = RazorpayPaymentSchema.parse(await razorpayRequest(`payments/${invoice.payment_id}`));
  if (payment.id !== invoice.payment_id || payment.invoice_id !== invoice.id || invoice.subscription_id !== subscriptionId || payment.currency !== invoice.currency || payment.amount !== invoice.amount || payment.amount_refunded > payment.amount) throw new Error("Payment invoice mismatch");
  const data = { organizationId, provider: "razorpay", providerSubscriptionId: subscriptionId, providerPaymentId: payment.id, providerInvoiceId: invoice.id, amount: payment.amount, currency: payment.currency, status: payment.status, refundedAmount: payment.amount_refunded, paidAt: new Date((invoice.paid_at || payment.created_at) * 1000) };
  const existing = await tx.billingPayment.findUnique({ where: { id: `razorpay:${payment.id}` } });
  if (existing && existing.organizationId !== organizationId) throw new Error("Payment tenant mismatch");
  await tx.billingPayment.upsert({ where: { id: `razorpay:${payment.id}` }, create: { id: `razorpay:${payment.id}`, ...data }, update: data });
  return payment;
}

export async function syncRazorpayAgreement(agreementId: string, eventKey?: string, eventPaymentId?: string) {
  let agreement = await prisma.razorpayAgreement.findUniqueOrThrow({ where: { id: agreementId } });
  if (!agreement.providerSubscriptionId) {
    const recovered = await recoverRazorpayAgreement(agreement);
    agreement = { ...agreement, providerSubscriptionId: recovered.id };
  }
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${agreement.organizationId} FOR UPDATE`;
    if (eventKey && await tx.billingEvent.findUnique({ where: { id: eventKey } })) return;
    // Read provider state after the tenant lock: reordered events cannot roll back a newer snapshot.
    const remote = RazorpaySubscriptionSchema.parse(await razorpayRequest(`subscriptions/${agreement.providerSubscriptionId}`));
    assertAgreement(remote, agreement);
    if (!isPlanId(agreement.plan)) throw new Error("Unknown stored plan");
    const invoices = await fetchInvoices(remote.id);
    if (invoices.some(invoice => invoice.subscription_id !== remote.id)) throw new Error("Invoice tenant mismatch");
    const paid = invoices.filter(invoice => invoice.status === "paid" && invoice.currency === "INR" && invoice.amount === agreement.amount && invoice.amount_paid === agreement.amount && invoice.payment_id && invoice.billing_end && invoice.billing_start && invoice.billing_end > invoice.billing_start && invoice.billing_start * 1000 <= Date.now())
      .sort((a, b) => b.billing_end! - a.billing_end!)[0];
    let paidUntil = new Date(0);
    if (paid) {
      const payment = await recordPayment(tx, agreement.organizationId, remote.id, paid);
      if (payment?.status === "captured" && payment.amount_refunded < payment.amount) paidUntil = new Date(paid.billing_end! * 1000);
    }
    if (eventPaymentId && eventPaymentId !== paid?.payment_id) {
      const eventPayment = RazorpayPaymentSchema.parse(await razorpayRequest(`payments/${encodeURIComponent(eventPaymentId)}`));
      if (eventPayment.invoice_id) {
        const invoice = RazorpayInvoiceSchema.parse(await razorpayRequest(`invoices/${eventPayment.invoice_id}`));
        if (invoice.subscription_id !== remote.id || invoice.payment_id !== eventPaymentId) throw new Error("Event payment mismatch");
        await recordPayment(tx, agreement.organizationId, remote.id, invoice);
      }
    }
    const latestAgreement = await tx.razorpayAgreement.findUniqueOrThrow({ where: { id: agreement.id } });
    const cancellation = latestAgreement.cancelAtPeriodEnd || terminal.has(remote.status);
    const paidAccess = paidUntil > new Date() && !["created", "authenticated", "expired"].includes(remote.status);
    const status = paidAccess ? "active" : terminal.has(remote.status) ? "canceled" : ["pending", "halted", "paused"].includes(remote.status) ? "past_due" : "incomplete";
    const existing = await tx.subscription.findUnique({ where: { organizationId: agreement.organizationId } });
    const matching = existing?.provider === "razorpay" && existing.providerSubscriptionId === remote.id;
    // An old agreement's delayed event must never replace the current subscription.
    const pending = await tx.billingCheckout.findFirst({ where: { organizationId: agreement.organizationId, provider: "razorpay", idempotencyKey: agreement.id } });
    if (matching || (!existing || existing.status === "canceled") && !!pending) {
      // A merely-created unpaid checkout must not suppress an existing free trial.
      if (matching || !["created", "authenticated", "expired", "cancelled"].includes(remote.status) || paidAccess) {
        const data = { provider: "razorpay", providerStatus: remote.status, cancelAtPeriodEnd: cancellation, providerCustomerId: remote.customer_id || `razorpay:${remote.id}`, providerSubscriptionId: remote.id, plan: agreement.plan, status, currency: "INR", currentPeriodEnd: paidUntil };
        await tx.subscription.upsert({ where: { organizationId: agreement.organizationId }, create: { organizationId: agreement.organizationId, ...data }, update: data });
        if (!matching || existing.status !== status || existing.currentPeriodEnd.getTime() !== paidUntil.getTime()) await recordAudit(tx, { organizationId: agreement.organizationId, userId: "provider:razorpay" }, "RAZORPAY_SUBSCRIPTION_UPDATED", remote.id);
      }
      if (paidAccess || terminal.has(remote.status)) await tx.billingCheckout.deleteMany({ where: { organizationId: agreement.organizationId, provider: "razorpay", idempotencyKey: agreement.id } });
    }
    await tx.razorpayAgreement.update({ where: { id: agreement.id }, data: { status: remote.status, lastSyncedAt: new Date(), nextSyncAt: new Date(Date.now() + (terminal.has(remote.status) && paidUntil <= new Date() ? 86400_000 : 15 * 60_000)), cancelAtPeriodEnd: cancellation } });
    if (eventKey) await tx.billingEvent.create({ data: { id: eventKey } });
  }, { timeout: 40000, maxWait: 3000 });
}

export async function refreshRazorpayBilling(organizationId: string) {
  const pending = await prisma.billingCheckout.findUnique({ where: { organizationId } });
  const current = await prisma.subscription.findUnique({ where: { organizationId } });
  const agreement = pending?.provider === "razorpay" && pending.idempotencyKey
    ? await prisma.razorpayAgreement.findUnique({ where: { id: pending.idempotencyKey } })
    : current?.provider === "razorpay" ? await prisma.razorpayAgreement.findUnique({ where: { providerSubscriptionId: current.providerSubscriptionId } }) : null;
  if (agreement) await syncRazorpayAgreement(agreement.id);
}

export async function cancelRazorpaySubscription(ctx: { organizationId: string; userId: string }) {
  const subscription = await prisma.subscription.findUniqueOrThrow({ where: { organizationId: ctx.organizationId } });
  if (subscription.provider !== "razorpay") throw new Error("Wrong provider");
  const agreement = await prisma.razorpayAgreement.findUniqueOrThrow({ where: { providerSubscriptionId: subscription.providerSubscriptionId } });
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${ctx.organizationId} FOR UPDATE`;
    const remote = RazorpaySubscriptionSchema.parse(await razorpayRequest(`subscriptions/${subscription.providerSubscriptionId}`));
    assertAgreement(remote, agreement);
    const latest = await tx.razorpayAgreement.findUniqueOrThrow({ where: { id: agreement.id } });
    if (!terminal.has(remote.status) && !latest.cancelAtPeriodEnd) {
      // Active agreements finish the paid cycle; delinquent/incomplete ones stop now.
      await razorpayRequest(`subscriptions/${remote.id}/cancel`, { cancel_at_cycle_end: remote.status === "active" ? 1 : 0 });
      await tx.razorpayAgreement.update({ where: { id: agreement.id }, data: { cancelAtPeriodEnd: true, nextSyncAt: new Date() } });
      await tx.subscription.update({ where: { organizationId: ctx.organizationId }, data: { cancelAtPeriodEnd: true } });
      await recordAudit(tx, ctx, "RAZORPAY_CANCELLATION_REQUESTED", remote.id);
    }
  }, { timeout: 25000 });
  await syncRazorpayAgreement(agreement.id);
}
