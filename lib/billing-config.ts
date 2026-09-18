import type { PlanId } from "@/lib/plans";

export function billingProvider(): "stripe" | "razorpay" {
  const provider = process.env.BILLING_PROVIDER || "stripe";
  if (provider !== "stripe" && provider !== "razorpay") throw new Error("Unknown billing provider");
  return provider;
}

export function razorpayConfigured(plan?: PlanId) {
  const key = process.env.RAZORPAY_KEY_ID?.trim();
  const mode = process.env.RAZORPAY_MODE || "test";
  return (mode === "test" || mode === "live") && !!key?.startsWith(`rzp_${mode}_`) &&
    !!process.env.RAZORPAY_KEY_SECRET?.trim() && !!process.env.RAZORPAY_WEBHOOK_SECRET?.trim() &&
    (!plan || !!process.env[`RAZORPAY_PLAN_${plan}_INR`]?.startsWith("plan_"));
}

export function billingConfigured() {
  return billingProvider() === "razorpay" ? razorpayConfigured() : !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
}
