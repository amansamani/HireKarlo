import Link from "next/link";

export const metadata = {
  title: "Cookie Policy",
  description: "How HireKarlo uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-14 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">← Back to HireKarlo</Link>
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">HireKarlo</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: September 9, 2026</p>
        </div>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section><h2 className="text-lg font-bold text-foreground">1. What are cookies?</h2><p className="mt-2">Cookies are small pieces of information stored by a website or its services. We also use similar browser storage technologies where needed for preferences and functionality.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">2. Essential technologies</h2><p className="mt-2">HireKarlo uses necessary technologies for authentication, security, OAuth state protection, session handling and other core functions. Blocking these technologies can prevent parts of the service from working.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">3. Analytics</h2><p className="mt-2">HireKarlo uses Vercel Web Analytics as an optional analytics service. Analytics is loaded only when a visitor selects “Accept analytics” in the consent banner. Vercel describes its Web Analytics offering as privacy-friendly and aggregated; exact data handling is governed by Vercel’s current terms and privacy documentation.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">4. Your choices</h2><p className="mt-2">On first visit, you can accept analytics, reject analytics, or open Manage Preferences. After making a choice, you can reopen “Cookie settings” from the bottom-left control and change your choice.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">5. Current HireKarlo categories</h2><div className="mt-3 overflow-hidden rounded-xl border border-border/50"><div className="grid grid-cols-2 border-b border-border/50 bg-card px-4 py-3 text-xs font-semibold text-foreground"><span>Category</span><span>Purpose</span></div><div className="grid grid-cols-2 border-b border-border/50 px-4 py-3 text-xs"><span>Essential</span><span>Security, authentication and core functionality</span></div><div className="grid grid-cols-2 px-4 py-3 text-xs"><span>Analytics</span><span>Aggregate usage insights and product improvement</span></div></div></section>
          <section><h2 className="text-lg font-bold text-foreground">6. Changes</h2><p className="mt-2">We may update this policy when the service or applicable requirements change. The “Last updated” date will be revised when material changes are made.</p></section>
          <p className="rounded-xl border border-border/50 bg-card/60 p-4 text-xs">This page is a practical product policy and should be reviewed with your final hosting, analytics, consent and legal setup before launch.</p>
        </div>
      </article>
    </main>
  );
}
