import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID, createHmac } from "crypto";
import { assertAuditDatabase } from "../helpers/audit-db";
const state = vi.hoisted(() => ({ ctx: { userId: "", organizationId: "", role: "OWNER" }, provider: vi.fn() }));
vi.mock("@/lib/require-auth", () => ({ requireOrg: async () => state.ctx }));
vi.mock("@/lib/razorpay", async original => ({ ...await original<typeof import("@/lib/razorpay")>(), razorpayRequest: state.provider, validatedRazorpayPlan: async () => "plan_test" }));
import { prisma } from "@/lib/prisma";
import { RazorpayError } from "@/lib/razorpay";
import { openRazorpayCheckout, abandonRazorpayCheckout } from "@/lib/razorpay-checkout";
import { syncRazorpayAgreement, cancelRazorpaySubscription } from "@/lib/razorpay-sync";
import { POST } from "@/app/api/billing/razorpay/webhook/route";
import { GET as reconcile } from "@/app/api/cron/billing-reconciliation/route";
import { checkoutAction, refreshBillingAction, cancelSubscriptionAction } from "@/actions/billing";

describe("Razorpay lifecycle with real isolated PostgreSQL", () => {
  const prefix = `razorpay-${randomUUID()}`;
  const now = Math.floor(Date.now() / 1000);
  const eventIds: string[] = [];
  let remote: { id: string; plan_id: string; status: string; customer_id: string; quantity: number; paid_count: number; current_start: number; current_end: number; short_url: string; notes: { organizationId: string; hirekarloIntentId: string } };
  let invoices: { id: string; subscription_id: string; status: string; amount: number; amount_paid: number; currency: string; payment_id: string; paid_at: number; billing_start: number; billing_end: number }[];
  let payment: { id: string; invoice_id: string; amount: number; currency: string; status: string; amount_refunded: number; created_at: number };
  let creations = 0, cancellations = 0, loseCreate = false;
  beforeAll(async () => {
    assertAuditDatabase();
    vi.stubEnv("BILLING_PROVIDER", "razorpay"); vi.stubEnv("RAZORPAY_MODE", "test"); vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_audit"); vi.stubEnv("RAZORPAY_KEY_SECRET", "synthetic"); vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "synthetic-webhook"); vi.stubEnv("RAZORPAY_PLAN_STARTER_INR", "plan_test"); vi.stubEnv("CRON_SECRET", "synthetic-cron");
    const user = await prisma.user.create({ data: { email: `${prefix}@example.test`, password: "unused", emailVerified: new Date() } });
    const org = await prisma.organization.create({ data: { name: prefix, ownerId: user.id } });
    state.ctx = { userId: user.id, organizationId: org.id, role: "OWNER" };
    await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });
  });
  beforeEach(async () => {
    await prisma.billingCheckout.deleteMany({ where: { organizationId: state.ctx.organizationId } });
    await prisma.subscription.deleteMany({ where: { organizationId: state.ctx.organizationId } });
    await prisma.billingPayment.deleteMany({ where: { organizationId: state.ctx.organizationId } });
    await prisma.razorpayAgreement.deleteMany({ where: { organizationId: state.ctx.organizationId } });
    state.ctx.role = "OWNER"; creations = 0; cancellations = 0; loseCreate = false; invoices = [];
    remote = { id: "sub_audit", plan_id: "plan_test", status: "created", customer_id: "cust_audit", quantity: 1, paid_count: 0, current_start: now - 60, current_end: now + 86400, short_url: "https://rzp.io/i/audit", notes: { organizationId: state.ctx.organizationId, hirekarloIntentId: "" } };
    payment = { id: "pay_audit", invoice_id: "inv_audit", amount: 149900, currency: "INR", status: "captured", amount_refunded: 0, created_at: now };
    state.provider.mockReset().mockImplementation(async (path: string, body?: { notes?: typeof remote.notes; cancel_at_cycle_end?: number }) => {
      if (path === "subscriptions") { creations++; remote.notes = body!.notes!; if (loseCreate) { loseCreate = false; throw new Error("Response lost after provider committed"); } return structuredClone(remote); }
      if (path.startsWith("subscriptions?")) return { items: [structuredClone(remote)] };
      if (path === `subscriptions/${remote.id}`) return structuredClone(remote);
      if (path === `subscriptions/${remote.id}/cancel`) { cancellations++; if (!body?.cancel_at_cycle_end) remote.status = "cancelled"; return structuredClone(remote); }
      if (path.startsWith("invoices?")) return { items: structuredClone(invoices) };
      if (path === `invoices/${payment.invoice_id}`) return structuredClone(invoices[0]);
      if (path === `payments/${payment.id}`) return structuredClone(payment);
      throw new Error(`Unexpected synthetic provider route: ${path}`);
    });
  });
  afterAll(async () => {
    await prisma.organization.delete({ where: { id: state.ctx.organizationId } });
    await prisma.user.delete({ where: { id: state.ctx.userId } });
    await prisma.auditEvent.deleteMany({ where: { organizationId: state.ctx.organizationId } });
    await prisma.billingEvent.deleteMany({ where: { id: { in: eventIds } } });
    vi.unstubAllEnvs(); await prisma.$disconnect();
  });
  async function start() { await openRazorpayCheckout(state.ctx, "STARTER", "INR"); return (await prisma.razorpayAgreement.findFirstOrThrow({ where: { organizationId: state.ctx.organizationId } })).id; }
  function paid() {
    remote.status = "active"; remote.paid_count = 1;
    invoices = [{ id: "inv_audit", subscription_id: remote.id, status: "paid", amount: 149900, amount_paid: 149900, currency: "INR", payment_id: payment.id, paid_at: now, billing_start: now - 60, billing_end: now + 86400 }];
  }
  function eventRequest(status = "subscription.charged", signature = true) {
    const body = JSON.stringify({ event: status, payload: { subscription: { entity: { id: remote.id, notes: remote.notes } }, payment: { entity: { id: payment.id } } }, nonce: randomUUID() });
    return new Request("https://audit.example.test/api/billing/razorpay/webhook", { method: "POST", body, headers: { "x-razorpay-signature": signature ? createHmac("sha256", "synthetic-webhook").update(body).digest("hex") : "bad" } });
  }
  it("creates only one remote subscription under concurrent checkout attempts", async () => {
    await Promise.allSettled(Array.from({ length: 4 }, () => openRazorpayCheckout(state.ctx, "STARTER", "INR")));
    expect(creations).toBe(1);
    expect(await prisma.razorpayAgreement.count({ where: { organizationId: state.ctx.organizationId } })).toBe(1);
    expect(await openRazorpayCheckout(state.ctx, "STARTER", "INR")).toBe(remote.short_url);
    await expect(openRazorpayCheckout(state.ctx, "GROWTH", "INR")).rejects.toMatchObject({ code: "unavailable" });
  });
  it("recovers a lost creation response without charging through a second agreement", async () => {
    loseCreate = true;
    await expect(openRazorpayCheckout(state.ctx, "STARTER", "INR")).rejects.toMatchObject({ code: "review" });
    expect(await openRazorpayCheckout(state.ctx, "STARTER", "INR")).toBe(remote.short_url); expect(creations).toBe(1);
  });
  it("keeps an ambiguous creation pending but clears a definitive rejection", async () => {
    state.provider.mockRejectedValueOnce(new RazorpayError(401));
    await expect(start()).rejects.toMatchObject({ code: "unavailable" });
    expect(await prisma.billingCheckout.findUnique({ where: { organizationId: state.ctx.organizationId } })).toBeNull();
    expect((await prisma.razorpayAgreement.findFirstOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("rejected");
  });
  it("preserves the trial and resume link while created or authenticated but unpaid", async () => {
    const id = await start(); await syncRazorpayAgreement(id); remote.status = "authenticated"; await syncRazorpayAgreement(id);
    expect(await prisma.subscription.findUnique({ where: { organizationId: state.ctx.organizationId } })).toBeNull();
    expect(await openRazorpayCheckout(state.ctx, "STARTER", "INR")).toBe(remote.short_url);
  });
  it("requires a correctly priced captured payment before granting paid access", async () => {
    const id = await start(); paid(); invoices[0].amount_paid = 1; await syncRazorpayAgreement(id);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("incomplete");
    invoices[0].amount_paid = 149900; payment.status = "authorized"; await syncRazorpayAgreement(id);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("incomplete");
    payment.status = "captured"; await syncRazorpayAgreement(id);
    const saved = await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } });
    expect(saved.status).toBe("active"); expect(saved.provider).toBe("razorpay"); expect(saved.currentPeriodEnd.getTime()).toBe((now + 86400) * 1000);
    expect(await prisma.billingCheckout.findUnique({ where: { organizationId: state.ctx.organizationId } })).toBeNull();
    expect(await prisma.billingPayment.count({ where: { organizationId: state.ctx.organizationId } })).toBe(1);
  });
  it("rejects tenant mismatches and preserves the database atomically", async () => {
    const id = await start(); paid(); remote.notes.organizationId = "other-tenant";
    await expect(syncRazorpayAgreement(id)).rejects.toThrow("ownership");
    expect(await prisma.subscription.findUnique({ where: { organizationId: state.ctx.organizationId } })).toBeNull();
    remote.notes.organizationId = state.ctx.organizationId; invoices[0].subscription_id = "sub_other";
    await expect(syncRazorpayAgreement(id)).rejects.toThrow("tenant mismatch");
  });
  it("rejects unsigned notifications and handles signed duplicates and stale events safely", async () => {
    await start(); paid(); expect((await POST(eventRequest("subscription.charged", false))).status).toBe(400);
    const request = eventRequest(); const { createHash } = await import("crypto");
    eventIds.push(`razorpay:${createHash("sha256").update(await request.clone().text()).digest("hex")}`);
    expect((await POST(request.clone())).status).toBe(200); expect((await POST(request.clone())).status).toBe(200);
    expect(await prisma.billingPayment.count({ where: { organizationId: state.ctx.organizationId } })).toBe(1);
    const stale = eventRequest("subscription.pending"); eventIds.push(`razorpay:${createHash("sha256").update(await stale.clone().text()).digest("hex")}`);
    expect((await POST(stale)).status).toBe(200);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("active");
  });
  it("records partial refunds and revokes paid access after a full refund", async () => {
    const id = await start(); paid(); await syncRazorpayAgreement(id);
    payment.amount_refunded = 100; await syncRazorpayAgreement(id);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("active");
    payment.amount_refunded = payment.amount; payment.status = "refunded"; await syncRazorpayAgreement(id);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).not.toBe("active");
    expect((await prisma.billingPayment.findUniqueOrThrow({ where: { id: "razorpay:pay_audit" } })).refundedAmount).toBe(payment.amount);
  });
  it("accepts refund notifications with Razorpay's empty-array notes format", async () => {
    await start(); paid();
    const body = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { id: "rfnd_audit", payment_id: payment.id, notes: [] } } }, nonce: randomUUID() });
    const { createHash } = await import("crypto"); eventIds.push(`razorpay:${createHash("sha256").update(body).digest("hex")}`);
    const request = new Request("https://audit.test/webhook", { method: "POST", body, headers: { "x-razorpay-signature": createHmac("sha256", "synthetic-webhook").update(body).digest("hex") } });
    expect((await POST(request)).status).toBe(200);
  });
  it("leaves verified state intact when the provider is unavailable", async () => {
    const id = await start(); paid(); await syncRazorpayAgreement(id);
    state.provider.mockRejectedValueOnce(new Error("Temporary provider failure"));
    await expect(syncRazorpayAgreement(id)).rejects.toThrow("provider failure");
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("active");
    expect(await prisma.billingPayment.count({ where: { organizationId: state.ctx.organizationId } })).toBe(1);
  });
  it("cancels renewal once and preserves paid access until the verified period expires", async () => {
    const id = await start(); paid(); await syncRazorpayAgreement(id);
    await cancelRazorpaySubscription(state.ctx); await cancelRazorpaySubscription(state.ctx); expect(cancellations).toBe(1);
    remote.status = "cancelled"; await syncRazorpayAgreement(id);
    let saved = await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } });
    expect(saved.status).toBe("active"); expect(saved.cancelAtPeriodEnd).toBe(true);
    invoices[0].billing_end = now - 1; await syncRazorpayAgreement(id);
    saved = await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } }); expect(saved.status).toBe("canceled");
  });
  it("verifies cancellation before discarding an unpaid checkout", async () => {
    await start(); await abandonRazorpayCheckout(state.ctx); expect(cancellations).toBe(1);
    expect(await prisma.billingCheckout.findUnique({ where: { organizationId: state.ctx.organizationId } })).toBeNull();
  });
  it("never overwrites a different current subscription from delayed events", async () => {
    const id = await start(); paid();
    await prisma.subscription.create({ data: { organizationId: state.ctx.organizationId, provider: "stripe", providerCustomerId: "cus_other", providerSubscriptionId: "sub_other", plan: "GROWTH", status: "active", currency: "USD", currentPeriodEnd: new Date(Date.now() + 86400_000) } });
    await syncRazorpayAgreement(id);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).provider).toBe("stripe");
  });
  it("blocks nonowners before any provider call", async () => {
    state.ctx.role = "ADMIN";
    await expect(checkoutAction(new FormData())).rejects.toThrow("NEXT_REDIRECT");
    await expect(refreshBillingAction()).rejects.toThrow("NEXT_REDIRECT");
    await expect(cancelSubscriptionAction(new FormData())).rejects.toThrow("NEXT_REDIRECT");
    expect(state.provider).not.toHaveBeenCalled();
  });
  it("allows one provider customer to pay for separate workspaces", async () => {
    const id = await start(); paid();
    const other = await prisma.organization.create({ data: { name: `${prefix}-second`, ownerId: state.ctx.userId } });
    try {
      await prisma.subscription.create({ data: { organizationId: other.id, provider: "razorpay", providerCustomerId: remote.customer_id, providerSubscriptionId: "sub_second", plan: "GROWTH", status: "active", currency: "INR", currentPeriodEnd: new Date(Date.now() + 86400_000) } });
      await syncRazorpayAgreement(id);
      expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("active");
      expect(await prisma.billingPayment.count({ where: { organizationId: other.id } })).toBe(0);
    } finally { await prisma.organization.delete({ where: { id: other.id } }); }
  });
  it("protects recovery jobs and reconciles a missed notification", async () => {
    const id = await start(); paid();
    expect((await reconcile(new Request("https://audit.test/cron"))).status).toBe(401);
    const result = await reconcile(new Request("https://audit.test/cron", { headers: { authorization: "Bearer synthetic-cron" } }));
    expect(result.status).toBe(200);
    expect((await prisma.razorpayAgreement.findUniqueOrThrow({ where: { id } })).lastSyncedAt).not.toBeNull();
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: state.ctx.organizationId } })).status).toBe("active");
  });
});
