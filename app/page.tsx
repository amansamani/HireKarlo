import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  KanbanSquare,
  MailCheck,
  FileSearch2,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Analytics } from "@vercel/analytics/next"

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-[url(/hero-bg.webp)] bg-cover bg-top bg-no-repeat sm:h-[760px]"
          aria-hidden="true"
        />
        {/* Nav */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                H
              </span>
              <span className="font-semibold tracking-tight">HireKarlo</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get started free
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero */}
        <main>
          <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              AI resume scoring, built in
            </div>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              <span className="font-script text-5xl font-normal text-primary sm:text-9xl">Hire</span>{" "}
                  faster, with an AI
                <br />
                copilot reading every resume
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Post a job, share one link, and let HireKarlo parse and score every
              applicant automatically — so you spend your time interviewing, not
              skimming PDFs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start hiring free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-card"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free for your first job posting
            </p>
          </section>

          {/* Product preview mockup */}
          <section className="mx-auto max-w-5xl px-6">
            <div className="brand-glow overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-xs text-muted-foreground">
                  HireKarlo.app/dashboard/jobs/senior-engineer
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-5">
                {[
                  { name: "Applied", count: 12, tone: "text-chart-2" },
                  { name: "Technical", count: 5, tone: "text-primary" },
                  { name: "HR Round", count: 3, tone: "text-warning" },
                  { name: "Offer", count: 1, tone: "text-success" },
                  { name: "Rejected", count: 4, tone: "text-destructive" },
                ].map((col) => (
                  <div key={col.name} className="rounded-xl border border-border bg-background/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${col.tone}`}>{col.name}</span>
                      <span className="text-[10px] text-muted-foreground">{col.count}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {Array.from({ length: col.name === "Applied" ? 3 : 1 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-lg border border-border/60 bg-card" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built for recruiters who want one tool for the whole pipeline —
            not five spreadsheets and a shared inbox.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={FileSearch2}
            title="AI resume scoring"
            description="Every applicant's resume is parsed and matched against the job description automatically, with a match score you can trust."
          />
          <FeatureCard
            icon={KanbanSquare}
            title="One pipeline, zero spreadsheets"
            description="A kanban view of every candidate, from applied to offer, with a full activity history for each move."
          />
          <FeatureCard
            icon={MailCheck}
            title="Candidates stay informed"
            description="Automatic email updates on every stage change and interview booking — no candidate left wondering."
          />
          <FeatureCard
            icon={Link2}
            title="One link, no accounts"
            description="Share a single public application link. Candidates apply in seconds without creating an account."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Your data, isolated"
            description="Every recruiter only ever sees their own jobs and candidates — enforced on every request, not just the UI."
          />
          <FeatureCard
            icon={Sparkles}
            title="Interview scheduling"
            description="Book technical and HR rounds directly from a candidate's card, with automatic activity logging."
          />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to stop skimming PDFs?
          </h2>
          <p className="max-w-md text-muted-foreground">
            Set up your first job posting in under two minutes. It&apos;s free
            to start.
          </p>
          <Link
            href="/register"
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Create your account <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} HireKarlo. Built by Aman Samani.
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/register" className="hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mb-1.5 text-sm font-medium">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}