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
  CheckCircle2,
  SearchCheck,
} from "lucide-react";
import { ResumeScanCard } from "@/components/landing/resume-scan-card";
import { Reveal } from "@/components/landing/reveal";

type Stage = {
  index: string;
  label: string;
  title: string;
  copy: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  ringClass: string;
  chipClass: string;
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
            <span className="text-[11px] font-bold text-success">Offer</span>
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
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary/30 selection:text-foreground">
      {/* ─── Nav with Track button ─── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.webp"
              alt="HireKarlo Logo"
              width={112}
              height={28}
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-bold tracking-tight">HireKarlo</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* ✅ NEW — Track button for candidates (always visible, even on mobile) */}
            <Link
              href="/track"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/50 px-3 sm:px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-card/80 hover:border-border"
            >
              <SearchCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="hidden sm:inline">Track Application</span>
              <span className="sm:hidden">Track</span>
            </Link>

            <Link
              href="/login"
              className="hidden md:inline-flex rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 sm:px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:shadow-primary/30 hover:scale-[1.02]"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ─── Hero ── */}
        <section className="relative isolate overflow-hidden min-h-[95dvh] flex items-center justify-center">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/hero-bg.webp"
              alt="Hero Background"
              fill
              sizes="100vw"
              className="object-cover opacity-40"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/95 to-background" />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_80%),transparent)]"
            aria-hidden="true"
          />

          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-24 sm:py-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div className="text-center lg:text-left">
              <Reveal delay={0}>
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-muted-foreground lg:mx-0 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  AI-Powered Applicant Tracking System
                </div>
              </Reveal>
              <Reveal delay={100}>
                <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                  <span className="font-script text-6xl font-normal text-primary sm:text-8xl lg:text-9xl">Hire</span>{" "}
                  faster.
                  <br />
                  <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Read fewer résumés.
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0 text-balance">
                  Post a job, share one link, and every applicant is parsed and scored against the
                  role before you ever open a PDF. Your pipeline arrives already sorted.
                </p>
              </Reveal>
              <Reveal delay={300}>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                  <Link
                    href="/register"
                    className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.02]"
                  >
                    Start hiring free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/track"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm px-8 text-sm font-medium text-foreground transition-all hover:bg-card/80 hover:border-border"
                  >
                    <SearchCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    Track your application
                  </Link>
                </div>
                <div className="mt-6 flex items-center justify-center gap-6 lg:justify-start text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No credit card required
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Free for your first job posting
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={400} className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl" />
                <div className="relative">
                  <ResumeScanCard />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Stats strip ─── */}
        <section className="relative border-y border-border/60 bg-card/30 backdrop-blur-sm py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/60">
              {[
                { value: "10x", label: "Faster hiring" },
                { value: "98%", label: "Resume match accuracy" },
                { value: "0", label: "Manual data entries" },
                { value: "24/7", label: "AI Interviewer" },
              ].map((stat, i) => (
                <Reveal key={stat.label} delay={i * 50} className="flex flex-col items-center text-center px-4">
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pipeline narrative ─── */}
        <section className="mx-auto max-w-6xl px-6 py-32">
          <Reveal className="mx-auto mb-20 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">The Pipeline</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              From application to offer, <span className="text-muted-foreground">on autopilot.</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The exact stages your candidates move through, fully automated.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {stages.map((stage, i) => (
              <Reveal key={stage.label} delay={i * 100}>
                <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md p-8 transition-all duration-300 hover:bg-card/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 h-full">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative z-10 flex items-start gap-4 mb-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${stage.ringClass} ${stage.chipClass}`}>
                      <stage.icon className={`h-6 w-6 ${stage.colorClass}`} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${stage.colorClass}`}>
                        Stage {stage.index} · {stage.label}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{stage.title}</h3>
                    </div>
                  </div>
                  <p className="relative z-10 text-base leading-relaxed text-muted-foreground mb-8">{stage.copy}</p>
                  <div className="relative z-10 mt-auto">{stage.visual}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ─── Interviewer accountability ─── */}
        <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-b from-card/20 via-background to-card/20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,color-mix(in_oklch,var(--primary),transparent_92%),transparent)]" />
          <div className="mx-auto max-w-6xl px-6 py-32">
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
              <Reveal>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Team Collaboration</p>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                    Interviewers get reviewed too.
                  </h2>
                  <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                    Interviewers submit a structured result and rating on every round they run.
                    Recruiters rate the interview right back — so a flaky interviewer shows up in
                    the data just as clearly as a flaky candidate.
                  </p>
                  <div className="mt-8 flex items-center gap-4">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.02]"
                    >
                      Explore the dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={200} className="relative">
                <div className="absolute -inset-8 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl opacity-50" />
                <div className="relative flex flex-col gap-6">
                  <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 shadow-xl shadow-black/10 transition-transform hover:-translate-y-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                      <Users2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Priya S. → Candidate</p>
                      <p className="text-[13px] text-muted-foreground">Result: Passed · Rating 4/5</p>
                    </div>
                  </div>
                  <div className="ml-6 h-6 w-px self-start bg-gradient-to-b from-border/60 to-transparent" aria-hidden="true" />
                  <div className="flex items-center gap-4 rounded-2xl border border-warning/20 bg-card/60 backdrop-blur-sm p-5 shadow-xl shadow-black/10 transition-transform hover:-translate-y-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 border border-warning/20">
                      <Star className="h-5 w-5 text-warning" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">You → Priya S.</p>
                      <p className="text-[13px] text-muted-foreground">Interviewer rating: 4/5</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ─── Trust strip ─── */}
        <section className="mx-auto max-w-6xl px-6 py-32">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Enterprise Ready</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Built for compliance and scale.</h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Data Isolation", copy: "Every recruiter only ever sees their own jobs and candidates — strictly enforced on every single database request." },
              { icon: Users2, title: "Role-Based Access", copy: "Owners, admins, recruiters, and interviewers each see exactly what their role needs and nothing more." },
              { icon: History, title: "Full Audit Trail", copy: "Every pipeline move is permanently logged — who did what, when, and on which application." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/20 backdrop-blur-sm p-8 transition-all duration-300 hover:bg-card/40 hover:border-primary/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-5">
                      <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground mb-3">{item.title}</h3>
                    <p className="text-base leading-relaxed text-muted-foreground">{item.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ─── Closing CTA ─── */}
        <section className="relative overflow-hidden pb-32">
          <div className="mx-auto max-w-4xl px-6">
            <Reveal className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur-xl px-8 py-20 text-center shadow-2xl shadow-primary/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/5" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Your first job posting takes two minutes.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
                  Post it, share the link, and let the pipeline sort itself while you do the interviewing.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="group relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:scale-[1.02]"
                  >
                    Create your account
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/track"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/50 px-8 text-base font-medium text-foreground transition-all hover:bg-card/80"
                  >
                    <SearchCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                    Already applied? Track it
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ─── Footer with Track link ─── */}
      <footer className="border-t border-border/60 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} HireKarlo. Built by Aman Samani.
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/track" className="hover:text-foreground transition-colors">Track Application</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}