import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  Link2,
  ScanSearch,
  CalendarClock,
  ListChecks,
  Star,
  ShieldCheck,
  Users2,
  History,
} from "lucide-react";
import { ResumeScanCard } from "@/components/landing/resume-scan-card";
import { Reveal } from "@/components/landing/reveal";

type Stage = {
  index: string;
  label: string;
  title: string;
  copy: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string; // text-*
  ringClass: string; // border-*
  chipClass: string; // bg-*/10
  visual: React.ReactNode;
};

export default function Home() {
  const stages: Stage[] = [
    {
      index: "01",
      label: "Applied",
      title: "One link. No account to create.",
      copy: "Share a single public URL on your job board or LinkedIn post. A candidate uploads a PDF or DOCX and lands in your pipeline in under a minute — nobody signs up to apply for a job.",
      icon: Link2,
      colorClass: "text-chart-2",
      ringClass: "border-chart-2/40",
      chipClass: "bg-chart-2/10",
      visual: (
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground">hirekarlo.app/jobs/senior-frontend-engineer</p>
          <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs font-medium text-foreground">Drop your resume</p>
            <p className="mt-1 text-[10px] text-muted-foreground">PDF or DOCX · no login required</p>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-chart-2/10 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-chart-2" />
            <p className="text-[11px] font-medium text-chart-2">Application received</p>
          </div>
        </div>
      ),
    },
    {
      index: "02",
      label: "Scored",
      title: "Gemini reads it before you do.",
      copy: "Every résumé is parsed server-side the moment it arrives and matched against your job description. A match score and a short AI summary land on the candidate's card — so the pipeline opens already sorted.",
      icon: ScanSearch,
      colorClass: "text-primary",
      ringClass: "border-primary/40",
      chipClass: "bg-primary/10",
      visual: (
        <div className="w-full max-w-xs space-y-2">
          {[
            { name: "P. Iyer", score: 94 },
            { name: "A. Samani", score: 88 },
            { name: "R. Verma", score: 61 },
          ].map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="text-xs text-foreground">{c.name}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {c.score}% match
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      index: "03",
      label: "Interview",
      title: "Scheduling that never leaves the dashboard.",
      copy: "Book a round from the candidate's card and HireKarlo checks the interviewer's calendar for conflicts, creates a real Google Meet link, and emails the candidate a calendar invite — automatically.",
      icon: CalendarClock,
      colorClass: "text-warning",
      ringClass: "border-warning/40",
      chipClass: "bg-warning/10",
      visual: (
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-foreground">Technical Interview Loop</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Thu, Aug 6 · 4:00 PM with Priya S.</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            <p className="text-[11px] font-medium text-warning">Meet link + invite sent</p>
          </div>
        </div>
      ),
    },
    {
      index: "04",
      label: "Decision",
      title: "Every move logged, every candidate told.",
      copy: "A stage change fires an email to the candidate the same second it happens, and a full activity log records who moved whom, when, and why — nothing about your pipeline depends on someone's memory.",
      icon: ListChecks,
      colorClass: "text-success",
      ringClass: "border-success/40",
      chipClass: "bg-success/10",
      visual: (
        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-success">Offer</span>
            <span className="text-[10px] text-muted-foreground">1 candidate</span>
          </div>
          <div className="mt-2 h-12 rounded-lg border border-success/30 bg-success/10" />
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground">P. Iyer shifted from HR Round to Offer</p>
            <p className="text-[10px] text-muted-foreground">Candidate notified by email</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.webp"
              alt="HireKarlo Logo"
              width={112}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
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

      <main>
        {/* Hero — the resume-scan card is the thesis, not a screenshot */}
        <section className="hero-grid relative isolate overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_88%),transparent)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-20 pb-24 sm:pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
            <div className="text-center lg:text-left">
              <div className="animate-in fade-in-0 slide-in-from-top-3 mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground duration-700 fill-mode-backwards lg:mx-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Gemini-powered resume scoring
              </div>
              <h1 className="animate-in fade-in-0 slide-in-from-bottom-4 mt-6 text-4xl font-semibold leading-[1.1] tracking-tight duration-700 delay-100 fill-mode-backwards sm:text-6xl">
                <span className="font-script text-5xl font-normal text-primary sm:text-8xl">Hire</span>{" "}
                faster.
                <br />
                Read fewer résumés.
              </h1>
              <p className="animate-in fade-in-0 slide-in-from-bottom-4 mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground duration-700 delay-200 fill-mode-backwards lg:mx-0">
                Post a job, share one link, and every applicant is parsed and
                scored against the role before you ever open a PDF. Your
                pipeline arrives already sorted.
              </p>
              <div className="animate-in fade-in-0 slide-in-from-bottom-4 mt-8 flex flex-col items-center justify-center gap-3 duration-700 delay-300 fill-mode-backwards sm:flex-row lg:justify-start">
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
              <p className="animate-in fade-in-0 mt-4 text-xs text-muted-foreground duration-700 delay-500 fill-mode-backwards">
                No credit card required · Free for your first job posting
              </p>
            </div>

            <div className="animate-in fade-in-0 slide-in-from-bottom-8 flex justify-center duration-1000 delay-300 fill-mode-backwards lg:justify-end">
              <ResumeScanCard />
            </div>
          </div>
        </section>

        {/* Pipeline narrative — the real order a resume moves through */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <Reveal className="mx-auto mb-16 max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">The pipeline</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              What happens after they hit apply
            </h2>
            <p className="mt-3 text-muted-foreground">
              Four stages, one dashboard — the same order your candidates
              actually move through.
            </p>
          </Reveal>

          <div className="space-y-14">
            {stages.map((stage, i) => (
              <Reveal key={stage.label} delay={i * 60}>
                <div className="flex gap-5 sm:gap-8">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold ${stage.colorClass} ${stage.ringClass}`}
                    >
                      {stage.index}
                    </span>
                    {i < stages.length - 1 && <span className="mt-2 w-px flex-1 bg-border" aria-hidden="true" />}
                  </div>

                  <div className="grid flex-1 grid-cols-1 items-center gap-6 pb-2 sm:grid-cols-[1.1fr_0.9fr] sm:gap-10">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${stage.colorClass}`}>
                        {stage.label}
                      </p>
                      <h3 className="mt-1.5 text-lg font-semibold tracking-tight sm:text-xl">{stage.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.copy}</p>
                    </div>
                    <div className="flex justify-start sm:justify-end">{stage.visual}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Interviewer accountability — the loop most ATS tools skip */}
        <section className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Reveal>
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Built for the whole team</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Interviewers get reviewed too.
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    Interviewers submit a structured result and rating on
                    every round they run. Recruiters rate the interview
                    right back — so a flaky interviewer shows up in the
                    data just as clearly as a flaky candidate.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Users2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Priya S. → Candidate</p>
                      <p className="text-[11px] text-muted-foreground">Result: Passed · Rating 4/5</p>
                    </div>
                  </div>
                  <div className="ml-4 h-4 w-px self-start bg-border" aria-hidden="true" />
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                      <Star className="h-4 w-4 text-warning" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">You → Priya S.</p>
                      <p className="text-[11px] text-muted-foreground">Interviewer rating: 4/5</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Trust strip — compact, not another feature grid */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <Reveal className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Data isolation", copy: "Every recruiter only ever sees their own jobs and candidates — enforced on every request." },
              { icon: Users2, title: "Role-based access", copy: "Owners, admins, recruiters, and interviewers each see exactly what their role needs." },
              { icon: History, title: "Full audit trail", copy: "Every pipeline move is logged — who did what, when, on every application." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.copy}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <Reveal className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-8 py-14 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your first job posting takes two minutes.
            </h2>
            <p className="max-w-md text-muted-foreground">
              Post it, share the link, and let the pipeline sort itself
              while you do the interviewing.
            </p>
            <Link
              href="/register"
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create your account <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </section>
      </main>

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