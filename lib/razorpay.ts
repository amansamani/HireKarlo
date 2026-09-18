import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { PLANS, type PlanId } from "@/lib/plans";

export class RazorpayError extends Error {
  constructor(public status: number) { super("Razorpay request failed"); }
  get definitiveRejection() { return [400, 401, 403, 404, 422].includes(this.status); }
}

export function razorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim(), secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const mode = process.env.RAZORPAY_MODE || "test";
  if (!["test", "live"].includes(mode) || !keyId?.startsWith(`rzp_${mode}_`) || !secret) throw new Error("Razorpay configuration unavailable");
  return { keyId, secret, mode };
}

export async function razorpayRequest(path: string, body?: unknown): Promise<unknown> {
  const { keyId, secret } = razorpayCredentials();
  if (!/^(plans|subscriptions|invoices|payments)([/?]|$)/.test(path)) throw new Error("Invalid provider path");
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body === undefined ? "GET" : "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new RazorpayError(response.status);
  return response.json();
}

export function validRazorpaySignature(body: Uint8Array, signature: string | null, secret: string) {
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(body).digest(), Buffer.from(signature, "hex"));
}

export const RazorpaySubscriptionSchema = z.object({
  id: z.string().regex(/^sub_[a-zA-Z0-9]+$/), plan_id: z.string().startsWith("plan_"),
  customer_id: z.string().nullish(), status: z.enum(["created", "authenticated", "active", "pending", "halted", "paused", "cancelled", "completed", "expired"]),
  quantity: z.number().int().positive(), paid_count: z.number().int().nonnegative(),
  current_start: z.number().int().nullable(), current_end: z.number().int().nullable(),
  notes: z.object({ organizationId: z.string(), hirekarloIntentId: z.string() }),
  short_url: z.string().nullish(),
});
export type RazorpaySubscription = z.infer<typeof RazorpaySubscriptionSchema>;
export const RazorpayInvoiceSchema = z.object({
  id: z.string().startsWith("inv_"), subscription_id: z.string().startsWith("sub_"), status: z.string(),
  amount: z.number().int(), amount_paid: z.number().int(), currency: z.string(),
  payment_id: z.string().nullish(), paid_at: z.number().int().nullish(),
  billing_start: z.number().int().nullish(), billing_end: z.number().int().nullish(),
});
export const RazorpayPaymentSchema = z.object({
  id: z.string().startsWith("pay_"), invoice_id: z.string().nullish(),
  amount: z.number().int().nonnegative(), currency: z.string(), status: z.string(),
  amount_refunded: z.number().int().nonnegative(), created_at: z.number().int(),
});

export function safeRazorpayUrl(value: string | null | undefined) {
  if (!value) throw new Error("Missing checkout URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !["rzp.io", "rzp.in", "razorpay.com"].includes(url.hostname)) throw new Error("Invalid checkout URL");
  return url.href;
}

export async function validatedRazorpayPlan(plan: PlanId) {
  const id = process.env[`RAZORPAY_PLAN_${plan}_INR`];
  if (!id || !/^plan_[a-zA-Z0-9]+$/.test(id)) throw new Error("Plan not configured");
  const remote = z.object({ id: z.string(), period: z.string(), interval: z.number(), item: z.object({ amount: z.number().int(), currency: z.string() }) }).parse(await razorpayRequest(`plans/${id}`));
  if (remote.id !== id || remote.period !== "monthly" || remote.interval !== 1 || remote.item.currency !== "INR" || remote.item.amount !== PLANS[plan].inr * 100) throw new Error("Plan price mismatch");
  return id;
}
