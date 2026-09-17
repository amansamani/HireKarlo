import { createHmac, timingSafeEqual } from "crypto";
import { PLANS, type PlanId } from "@/lib/plans";

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("NEXT_PUBLIC_APP_URL is required for billing");
  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Billing requires HTTPS");
  return url.origin;
}
export function priceId(plan: PlanId, currency: "INR" | "USD") {
  const value = process.env[`STRIPE_PRICE_${plan}_${currency}`];
  if (!value) throw new Error("Billing is not configured for this currency yet");
  return value;
}
export function planForPrice(id: string): { plan: PlanId; currency: "INR" | "USD" } | null {
  for (const plan of Object.keys(PLANS) as PlanId[]) {
    for (const currency of ["INR", "USD"] as const) {
      if (process.env[`STRIPE_PRICE_${plan}_${currency}`] === id) return { plan, currency };
    }
  }
  return null;
}
export async function stripeRequest(path: string, body?: URLSearchParams, idempotencyKey?: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Billing is not configured yet");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${secret}`, "Stripe-Version": "2025-06-30.basil", ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body,
  });
  if (!response.ok) throw new Error(`Billing provider returned ${response.status}`);
  return response.json();
}
export function validWebhookSignature(body: string, signature: string | null, secret: string, now = Date.now()) {
  if (!signature) return false;
  const entries = signature.split(",").map(part => part.split("="));
  const timestamp = entries.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  return entries.some(([key, value]) => {
    if (key !== "v1" || !/^[a-f0-9]{64}$/i.test(value ?? "")) return false;
    const actual = Buffer.from(value, "hex");
    return actual.length === expected.length && timingSafeEqual(expected, actual);
  });
}
