import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { razorpayCredentials, validRazorpayCheckoutSignature } from "@/lib/razorpay";
import { syncRazorpayAgreement } from "@/lib/razorpay-sync";

const Callback = z.object({ razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/), razorpay_subscription_id: z.string().regex(/^sub_[a-zA-Z0-9]+$/), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) });
export async function completeRazorpayCheckout(ctx: { organizationId: string; role: string }, agreementId: string, callback?: unknown) {
  if (ctx.role !== "OWNER" || typeof agreementId !== "string" || agreementId.length > 100) throw new Error("Checkout unavailable");
  const agreement = await prisma.razorpayAgreement.findFirstOrThrow({ where: { id: agreementId, organizationId: ctx.organizationId } });
  const credentials = razorpayCredentials();
  if (!agreement.providerSubscriptionId || agreement.keyId !== credentials.keyId) throw new Error("Checkout unavailable");
  if (callback !== undefined) {
    const value = Callback.parse(callback);
    // The subscription identity comes from our persisted tenant agreement.
    if (value.razorpay_subscription_id !== agreement.providerSubscriptionId || !validRazorpayCheckoutSignature(value.razorpay_payment_id, agreement.providerSubscriptionId, value.razorpay_signature, credentials.secret)) throw new Error("Invalid payment confirmation");
  }
  // A valid browser signature is not proof of a captured invoice or paid access.
  await syncRazorpayAgreement(agreement.id);
  const subscription = await prisma.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
  return subscription?.provider === "razorpay" && subscription.providerSubscriptionId === agreement.providerSubscriptionId && subscription.status === "active" && subscription.currentPeriodEnd > new Date() ? "verified" as const : "pending" as const;
}
