import Link from "next/link";
import { PLANS } from "@/lib/plans";
export const metadata = { title: "Pricing" };
export default function PricingPage() {
  return <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
    <Link href="/" className="text-primary">← HireKarlo</Link>
    <p className="eyebrow mt-14">For companies and recruitment agencies</p>
    <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-.05em] sm:text-6xl">One workspace for your hiring team.</h1>
    <p className="mt-4 max-w-2xl text-muted-foreground">Start with a 14-day trial. Plans include your recruiter seats, candidate pipeline, public job links, interview scheduling, and a measured AI allowance.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-3">{Object.entries(PLANS).map(([id, plan]) => <article key={id} className={`relative rounded-3xl border p-7 ${id === "GROWTH" ? "border-primary/40 bg-primary/5" : "border-border bg-card/60"}`}>
      <p className="eyebrow mb-6">{id === "STARTER" ? "For your first team" : id === "GROWTH" ? "Room to grow" : "Across your clients"}</p><h2 className="text-xl font-medium">{plan.name}</h2>
      <p className="mt-5 text-3xl font-bold">₹{plan.inr.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
      <p className="mt-2 text-muted-foreground">International: ${plan.usd} / month</p>
      <ul className="my-6 space-y-3 text-sm"><li>{plan.seats} recruiter / admin seats</li><li>{plan.jobs} active jobs</li><li>{plan.candidates.toLocaleString()} stored candidates</li><li>{plan.aiScores} AI screening attempts per UTC calendar month</li><li>Interviewers do not consume recruiter seats</li></ul>
      <Link href="/register" className="flex min-h-12 items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Start your trial</Link>
    </article>)}</div>
    <p className="mt-8 text-sm text-muted-foreground">Trial includes 5 recruiter seats, 20 jobs, and 100 total AI attempts. Taxes may apply. No automatic charge at trial expiry. Data remains available to authorized recruiters for review and export; new jobs, invitations, and AI usage require an active plan. Extra usage is blocked without automatic overage charges. AI scores support human review and do not make hiring decisions.</p>
    <p className="mt-4 text-sm text-muted-foreground">Agency client records are included. Client portals, placement invoicing, job-board syndication, SSO, and contractual uptime guarantees are not included.</p>
    <div className="mt-6 flex gap-5 text-sm"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href="mailto:amanworkinfo@gmail.com">Contact Aman</a></div>
  </main>;
}
