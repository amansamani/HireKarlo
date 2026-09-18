"use server";
import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { appUrl, stripeRequest } from "@/lib/billing-provider";
import { isPlanId } from "@/lib/plans";
import { allowRequest } from "@/lib/rate-limit";
import { CheckoutError, openCheckout, abandonCheckout } from "@/lib/checkout";
import { logError } from "@/lib/logger";
import { billingProvider } from "@/lib/billing-config";
import { openRazorpayCheckout, abandonRazorpayCheckout } from "@/lib/razorpay-checkout";
import { cancelRazorpaySubscription, refreshRazorpayBilling } from "@/lib/razorpay-sync";
import { completeRazorpayCheckout } from "@/lib/razorpay-completion";

export async function checkoutAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  let url: string;
  try {
    const plan = String(form.get("plan")), currency = String(form.get("currency"));
    if (!isPlanId(plan) || (currency !== "INR" && currency !== "USD")) throw new Error("Invalid plan");
    if (!(await allowRequest(`checkout:${ctx.organizationId}`, 5, 600_000))) throw new Error("Rate limited");
    if (billingProvider() === "razorpay") {
      await openRazorpayCheckout(ctx, plan, currency);
      url = "/dashboard/billing/checkout";
    } else url = await openCheckout(ctx, plan, currency);
  } catch (error) {
    logError("billing.checkout_failed", error);
    redirect(`/dashboard/billing?error=${error instanceof CheckoutError ? error.code : "checkout"}`);
  }
  redirect(url);
}

export async function abandonCheckoutAction() {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  try {
    if (!(await allowRequest(`checkout:${ctx.organizationId}`, 5, 600_000))) throw new Error("Rate limited");
    const pending = await prisma.billingCheckout.findUnique({ where: { organizationId: ctx.organizationId } });
    if (pending?.provider === "razorpay") await abandonRazorpayCheckout(ctx);
    else await abandonCheckout(ctx);
  } catch (error) {
    logError("billing.checkout_expire_failed", error);
    redirect(`/dashboard/billing?error=${error instanceof CheckoutError ? error.code : "checkout"}`);
  }
  redirect("/dashboard/billing");
}

export async function billingPortalAction() {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  let url: string;
  try {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId: ctx.organizationId } });
    if (!subscription || subscription.provider !== "stripe") throw new Error("No Stripe subscription");
    if (!(await allowRequest(`portal:${ctx.organizationId}`, 10, 600_000))) throw new Error("Rate limited");
    const result = await stripeRequest("billing_portal/sessions", new URLSearchParams({ customer: subscription.providerCustomerId, return_url: `${appUrl()}/dashboard/billing` }));
    if (typeof result.url !== "string" || !result.url.startsWith("https://billing.stripe.com/")) throw new Error("Invalid billing URL");
    url = result.url;
  } catch { redirect("/dashboard/billing?error=portal"); }
  redirect(url);
}

export async function refreshBillingAction() {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  try {
    if (!(await allowRequest(`billing-refresh:${ctx.organizationId}`, 10, 600_000))) throw new Error("Rate limited");
    await refreshRazorpayBilling(ctx.organizationId);
  } catch (error) { logError("billing.refresh_failed", error); redirect("/dashboard/billing?error=review"); }
  redirect("/dashboard/billing?refreshed=1");
}

export async function completeRazorpayCheckoutAction(agreementId: string, callback?: unknown) {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") return { status: "error" as const };
  try {
    if (!(await allowRequest(`billing-refresh:${ctx.organizationId}`, 10, 600_000))) throw new Error("Rate limited");
    return { status: await completeRazorpayCheckout(ctx, agreementId, callback) };
  } catch (error) { logError("billing.checkout_confirmation_failed", error); return { status: "error" as const }; }
}

export async function cancelSubscriptionAction(form: FormData) {
  const ctx = await requireOrg();
  if (!ctx || ctx.role !== "OWNER") redirect("/dashboard/billing?error=owner");
  if (form.get("confirm") !== "yes") redirect("/dashboard/billing?error=confirmation");
  try {
    if (!(await allowRequest(`billing-cancel:${ctx.organizationId}`, 5, 600_000))) throw new Error("Rate limited");
    await cancelRazorpaySubscription(ctx);
  } catch (error) { logError("billing.cancel_failed", error); redirect("/dashboard/billing?error=review"); }
  redirect("/dashboard/billing?cancelled=1");
}
