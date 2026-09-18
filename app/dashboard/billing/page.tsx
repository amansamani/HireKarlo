import { SubmitButton } from "@/components/ui/submit-button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { PLANS, effectivePlan, type PlanId } from "@/lib/plans";
import { billingProvider, billingConfigured, razorpayConfigured } from "@/lib/billing-config";
import { checkoutAction, billingPortalAction, abandonCheckoutAction, refreshBillingAction, cancelSubscriptionAction } from "@/actions/billing";
export const maxDuration = 60;

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ error?: string; checkout?: string; refreshed?: string; cancelled?: string }> }) {
  const ctx = await requireOrg();
  if (!ctx || !["OWNER", "ADMIN"].includes(ctx.role)) redirect("/dashboard");
  const query = await searchParams;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, include: { subscription: true, checkout: true } });
  const plan = effectivePlan(org.subscription, org.trialEndsAt);
  const period = plan?.trial ? "trial" : new Date().toISOString().slice(0, 7);
  const [usage, seats, jobs, candidates, payments] = await Promise.all([
    prisma.usageCounter.findUnique({ where: { organizationId_period: { organizationId: ctx.organizationId, period } } }),
    prisma.membership.count({ where: { organizationId: ctx.organizationId, role: { not: "INTERVIEWER" } } }),
    prisma.job.count({ where: { organizationId: ctx.organizationId, status: "OPEN" } }),
    prisma.candidate.count({ where: { organizationId: ctx.organizationId } }),
    prisma.billingPayment.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { paidAt: "desc" }, take: 25 }),
  ]);
  const provider = billingProvider(), enabled = billingConfigured(), owner = ctx.role === "OWNER";
  const razorpayAccount = org.subscription?.provider === "razorpay" || org.checkout?.provider === "razorpay";
  const errors: Record<string, string> = {
    owner: "Only the owner can manage payments.", pending: "An unfinished checkout exists. Resume that plan or cancel it before choosing another plan.",
    existing: "Your workspace already has a subscription. Manage it below; contact support for a plan change.",
    review: "Payment confirmation or reconciliation is pending. Use Refresh payment status or contact support before paying again.",
    unavailable: "This plan is not available for checkout yet. Contact support.", confirmation: "Select the confirmation checkbox to stop renewal.",
  };
  const button = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm";
  return <section className="mx-auto max-w-6xl space-y-7">
    <div><p className="eyebrow mb-3">Workspace settings</p><h1 className="text-3xl font-semibold tracking-tight">Billing & usage</h1><p className="mt-2 text-muted-foreground">{org.name} · {plan?.id ?? "Plan required"}</p></div>
    {provider === "razorpay" && process.env.RAZORPAY_MODE !== "live" && <p role="status" className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">Test payments only. No real money is collected. Test subscriptions apply only to this test environment.</p>}
    {provider === "razorpay" && process.env.RAZORPAY_MODE !== "live" && <p className="text-sm text-muted-foreground">For card testing, use Razorpay’s subscription test cards. A card rejected for recurring payments must be replaced with a supported test card. <a className="text-primary underline" href="https://razorpay.com/docs/payments/subscriptions/test/" target="_blank" rel="noopener noreferrer">Subscription testing guide</a>. Once your plan is active, no additional checkout is needed.</p>}
    {query.error && <p role="alert" className="rounded-lg border border-destructive p-4">{errors[query.error] ?? "Billing could not be updated. Check your subscription status before paying again."}</p>}
    {query.checkout && <p role="status">{query.checkout === "verified" && org.subscription?.status === "active" ? "Payment verified. Your subscription is active." : "Payment confirmation is pending. Use Refresh payment status; your plan activates after the server verifies a captured payment."}</p>}
    {query.refreshed && <p role="status">Payment status checked with the provider.</p>}
    {query.cancelled && <p role="status">Cancellation checked. See the renewal status below.</p>}
    <p className="text-sm">{org.subscription ? "Subscription: " + (org.subscription.providerStatus || org.subscription.status) + ". " + (org.subscription.currentPeriodEnd.getTime() > 0 ? "Verified paid access through " + org.subscription.currentPeriodEnd.toISOString().slice(0, 10) + "." : "No paid period verified yet.") : "Trial ends " + org.trialEndsAt.toISOString().slice(0, 10) + ". No automatic payment."}</p>
    {org.subscription?.cancelAtPeriodEnd && <p>Renewal is cancelled. Any remaining verified paid access stays available until its end date.</p>}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[["Recruiter seats", seats, plan?.limits.seats], ["Active jobs", jobs, plan?.limits.jobs], ["Candidates", candidates, plan?.limits.candidates], ["AI attempts", usage?.aiScores ?? 0, plan?.limits.aiScores]].map(([name, used, max]) => <div key={String(name)} className="rounded-2xl border border-border bg-card/70 p-6"><p className="text-sm text-muted-foreground">{name}</p><p className="mt-2 text-2xl font-bold">{used} / {max ?? "—"}</p></div>)}</div>
    {!enabled && <p className="rounded-lg bg-muted p-4 text-sm">Online billing is being configured. Contact support for onboarding. Contacting support does not activate a paid subscription.</p>}
    {owner && razorpayAccount && razorpayConfigured() && <form action={refreshBillingAction}><SubmitButton pendingLabel="Checking payment…" className={button}>Refresh payment status</SubmitButton><p className="mt-2 text-sm text-muted-foreground">Return here after completing Razorpay checkout. This securely checks your subscription and payment.</p></form>}
    {owner && org.subscription?.provider === "stripe" && process.env.STRIPE_SECRET_KEY && <form action={billingPortalAction}><SubmitButton pendingLabel="Opening billing portal…" className={button}>Manage payment method, invoices & cancellation</SubmitButton></form>}
    {owner && org.subscription?.provider === "razorpay" && razorpayConfigured() && !org.subscription.cancelAtPeriodEnd && org.subscription.status !== "canceled" && <form action={cancelSubscriptionAction} className="space-y-3 rounded-2xl border border-border bg-card/50 p-5"><p>Stop future subscription renewals. Active subscriptions finish their current paid cycle; unpaid or delinquent subscriptions are cancelled immediately.</p><label className="flex items-center gap-2"><input name="confirm" value="yes" type="checkbox" required/> I want to stop automatic renewal</label><SubmitButton pendingLabel="Cancelling renewal…" className={button}>Cancel subscription renewal</SubmitButton></form>}
    {org.checkout && owner && <form action={abandonCheckoutAction} className="rounded-2xl border border-border bg-card/50 p-5"><p>Pending checkout: {org.checkout.plan ?? "Previous selection"} {org.checkout.currency}. Choose the same plan below to resume, or cancel the unpaid checkout to change your selection.</p><SubmitButton className="mt-3 rounded border border-border px-4 py-2">Cancel pending checkout</SubmitButton></form>}
    <div className="grid gap-4 md:grid-cols-3">{Object.entries(PLANS).map(([id, item]) => <article key={id} className="rounded-2xl border border-border bg-card/70 p-6">
      <h2 className="text-xl font-bold">{item.name}</h2><p className="mt-4 text-2xl font-semibold tracking-tight">₹{item.inr.toLocaleString("en-IN")} {provider === "stripe" && "/ $" + item.usd} monthly</p>
      <p className="mt-3 text-sm text-muted-foreground">{item.seats} seats · {item.jobs} jobs · {item.aiScores} AI attempts</p>
      <form action={checkoutAction} className="mt-5 space-y-3"><input name="plan" type="hidden" value={id}/>
        {provider === "razorpay" ? <><input name="currency" type="hidden" value="INR"/><p className="text-sm">Pay in INR through Razorpay.</p></> : <label className="block text-sm">Billing currency<select name="currency" className="mt-2 block w-full rounded border border-border bg-background p-2"><option value="INR">INR — India pricing</option><option value="USD">USD — International pricing</option></select></label>}
        <SubmitButton pendingLabel="Preparing secure checkout…" disabled={!enabled || !owner || (provider === "razorpay" && !razorpayConfigured(id as PlanId)) || (!!org.subscription && org.subscription.status !== "canceled")} className={button + " w-full"}>Choose {item.name}</SubmitButton>
      </form>
    </article>)}</div>
    {provider === "razorpay" && <p className="text-sm text-muted-foreground">Subscriptions renew monthly until cancelled or the 120-cycle agreement completes. The amount displayed is the configured plan charge. Contact support for plan changes, tax invoices, refunds or payment-method assistance.</p>}
    <section className="space-y-4 rounded-2xl border border-border bg-card/50 p-6"><h2 className="text-xl font-semibold">Payment history</h2><p className="text-sm text-muted-foreground">{provider === "razorpay" && process.env.RAZORPAY_MODE !== "live" ? "These are simulated Test Mode transactions. A captured test payment confirms the test flow; no real money was collected." : "Latest 25 verified Razorpay payment records for this workspace."} These records are not tax invoices.</p>
      {payments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr><th className="p-2">Date (UTC)</th><th>Amount</th><th>Status</th><th>Refunded</th><th>Reference</th></tr></thead><tbody>{payments.map(payment => <tr className="border-t border-border" key={payment.id}><td className="p-2">{payment.paidAt.toISOString().slice(0, 10)}</td><td>{payment.currency} {(payment.amount / 100).toFixed(2)}</td><td>{payment.status}</td><td>{(payment.refundedAmount / 100).toFixed(2)}</td><td>{payment.providerPaymentId}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-medium">Your payment history starts here</p><p className="mt-2 text-sm text-muted-foreground">Verified payments will appear after checkout. You don’t need to pay again for an active subscription.</p></div>}
    </section>
    <p className="text-sm text-muted-foreground">AI attempts reset at the start of each UTC calendar month on paid plans. Failed attempts can consume credits. Your trial gets 100 total attempts. Limits apply to each organization; pending recruiter invitations reserve seats. No automatic overage charges.</p>
    <Link className="inline-block text-primary" href="/pricing">Compare plans</Link>
  </section>;
}
