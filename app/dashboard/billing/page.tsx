import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { PLANS, effectivePlan } from "@/lib/plans";
import { checkoutAction, billingPortalAction } from "@/actions/billing";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ error?: string; checkout?: string }> }) {
  const ctx = await requireOrg();
  if (!ctx || !["OWNER", "ADMIN"].includes(ctx.role)) redirect("/dashboard");
  const query = await searchParams;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, include: { subscription: true } });
  const plan = effectivePlan(org.subscription, org.trialEndsAt);
  const period = plan?.trial ? "trial" : new Date().toISOString().slice(0, 7);
  const [usage, seats, jobs, candidates] = await Promise.all([
    prisma.usageCounter.findUnique({ where: { organizationId_period: { organizationId: ctx.organizationId, period } } }),
    prisma.membership.count({ where: { organizationId: ctx.organizationId, role: { not: "INTERVIEWER" } } }),
    prisma.job.count({ where: { organizationId: ctx.organizationId, status: "OPEN" } }),
    prisma.candidate.count({ where: { organizationId: ctx.organizationId } }),
  ]);
  const enabled = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
  return <main className="mx-auto max-w-5xl p-6">
    <h1 className="text-3xl font-bold">Billing & usage</h1><p className="mt-2 text-muted-foreground">{org.name} · {plan?.id ?? "Plan required"}</p>
    {query.error && <p role="alert" className="mt-5 rounded-lg border border-destructive p-4">{query.error === "owner" ? "Only the owner can manage payments." : "We couldn't open billing. Please contact support; no plan has been activated by this request."}</p>}
    {query.checkout && <p role="status" className="mt-5 rounded-lg border border-border p-4">Checkout completed. Your plan activates after payment verification. Refresh this page shortly to see the confirmed status.</p>}
    <p className="mt-5 text-sm">{org.subscription ? `Subscription: ${org.subscription.status}. Current period ends ${org.subscription.currentPeriodEnd.toISOString().slice(0, 10)}.` : `Trial ends ${org.trialEndsAt.toISOString().slice(0, 10)}. No automatic payment.`}</p>
    <div className="my-7 grid grid-cols-2 gap-4 md:grid-cols-4">{[["Recruiter seats", seats, plan?.limits.seats], ["Active jobs", jobs, plan?.limits.jobs], ["Candidates", candidates, plan?.limits.candidates], ["AI attempts", usage?.aiScores ?? 0, plan?.limits.aiScores]].map(([name, used, max]) => <div key={String(name)} className="rounded-xl border border-border p-5"><p className="text-sm text-muted-foreground">{name}</p><p className="mt-2 text-2xl font-bold">{used} / {max ?? "—"}</p></div>)}</div>
    {!enabled && <p className="mb-6 rounded-lg bg-muted p-4 text-sm">Online billing is being configured. <a className="underline" href="mailto:amanworkinfo@gmail.com?subject=HireKarlo%20subscription">Contact Aman for onboarding</a>. Contacting support does not activate a paid subscription.</p>}
    {org.subscription && ctx.role === "OWNER" && enabled && <form action={billingPortalAction}><button className="mb-6 rounded-lg bg-primary px-5 py-3 text-primary-foreground">Manage payment method, invoices & cancellation</button></form>}
    <div className="grid gap-4 md:grid-cols-3">{Object.entries(PLANS).map(([id, item]) => <article key={id} className="rounded-xl border border-border p-5"><h2 className="text-xl font-bold">{item.name}</h2><p className="mt-3">₹{item.inr.toLocaleString("en-IN")} / ${item.usd} monthly</p><p className="mt-3 text-sm text-muted-foreground">{item.seats} seats · {item.jobs} jobs · {item.aiScores} AI attempts</p><form action={checkoutAction} className="mt-5 space-y-3"><input name="plan" type="hidden" value={id}/><label className="block text-sm">Billing currency<select name="currency" className="mt-2 block w-full rounded border border-border bg-background p-2"><option value="INR">INR — India pricing</option><option value="USD">USD — International pricing</option></select></label><button disabled={!enabled || ctx.role !== "OWNER" || (!!org.subscription && org.subscription.status !== "canceled")} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-40">Choose {item.name}</button></form></article>)}</div>
    <p className="mt-7 text-sm text-muted-foreground">AI attempts reset at the start of each UTC calendar month on paid plans. Failed attempts can consume credits. Your trial gets 100 total attempts. Limits apply to each organization; pending recruiter invitations reserve seats. Taxes may apply. No automatic overage charges.</p>
    <Link className="mt-5 inline-block text-primary" href="/pricing">Compare plans</Link>
  </main>;
}
