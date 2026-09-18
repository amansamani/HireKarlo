import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { razorpayCredentials } from "@/lib/razorpay";
import { isPlanId, PLANS } from "@/lib/plans";
import RazorpayCheckout from "./RazorpayCheckout";
export const maxDuration = 60;

export default async function CheckoutPage() {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  const pending = await prisma.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
  if (pending?.provider !== "razorpay" || !pending.idempotencyKey) redirect("/dashboard/billing");
  const agreement = await prisma.razorpayAgreement.findFirst({ where: { id: pending.idempotencyKey, organizationId: ctx.organizationId } });
  let keyId: string, mode: string;
  try { ({ keyId, mode } = razorpayCredentials()); } catch { redirect("/dashboard/billing?error=unavailable"); }
  if (!agreement?.providerSubscriptionId || agreement.keyId !== keyId || !isPlanId(agreement.plan)) redirect("/dashboard/billing?error=review");
  if (pending.expiresAt <= new Date()) redirect("/dashboard/billing?error=review");
  return <RazorpayCheckout agreementId={agreement.id} subscriptionId={agreement.providerSubscriptionId} keyId={keyId} testMode={mode === "test"} planName={PLANS[agreement.plan].name} amount={agreement.amount} />;
}
