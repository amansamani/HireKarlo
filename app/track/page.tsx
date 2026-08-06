"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search, Loader2, Briefcase, Mail, CheckCircle2, Circle, XCircle,
  ArrowLeft, ShieldCheck,
} from "lucide-react";

// ✅ REAL actions
import { sendApplicationOtpAction, getApplicationStatusAction } from "@/actions/public-apply";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FLOW = ["APPLIED", "TECHNICAL", "HR", "OFFER"] as const;

type TrackedApplication = {
  stage: string;
  appliedDate: Date | string;
  job: { title: string; department: string };
};

export default function TrackPage() {
  const [step, setStep] = useState<"email" | "otp" | "results">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<TrackedApplication[]>([]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const res = await sendApplicationOtpAction(email.trim());
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(`Code sent to ${email.trim()}.`);
      setStep("otp");
    }
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await getApplicationStatusAction(email.trim(), otp.trim());
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      setResults(res.applications ?? []);
      setStep("results");
    }
  }

  return (
    <div className="relative isolate min-h-dvh">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/hero-bg.webp" alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
      </div>

      <header className="mx-auto flex max-w-2xl items-center px-6 py-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Track your application</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verify with your email to see every stage in real time.
          </p>
        </div>

        {step !== "results" ? (
          <form onSubmit={step === "email" ? sendCode : lookup}
            className="mt-8 space-y-3 rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 shadow-xl">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" value={email} disabled={step === "otp"}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="h-12 pl-10 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
            </div>

            {step === "otp" && (
              <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••" inputMode="numeric"
                className="h-14 rounded-xl border-border/60 bg-background/50 text-center text-2xl font-bold tracking-[0.5em] focus:border-primary/60 focus:ring-2 focus:ring-primary/20 animate-in fade-in slide-in-from-top-2 duration-300" />
            )}

            <Button type="submit" disabled={busy}
              className="h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : step === "email" ? (<><Search className="h-4 w-4 mr-1.5" /> Send me a code</>) : (<><ShieldCheck className="h-4 w-4 mr-1.5" /> Verify & track</>)}
            </Button>

            {step === "otp" && (
              <button type="button" onClick={() => setStep("email")}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3" /> Use a different email
              </button>
            )}
          </form>
        ) : (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 py-12 text-center text-sm text-muted-foreground">
                No applications found for this email yet.
              </div>
            )}
            {results.map((app,idx) => {
              const currentIdx = FLOW.indexOf(app.stage as (typeof FLOW)[number]);
              const rejected = app.stage === "REJECTED";
              return (
                <div key={idx} className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{app.job.title}</p>
                        <p className="text-[11px] text-muted-foreground">{app.job.department}</p>
                      </div>
                    </div>
                    {rejected ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive">
                        <XCircle className="h-3 w-3" /> Not selected
                      </span>
                    ) : (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                        {app.stage}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex items-center">
                    {FLOW.map((s, i) => {
                      const reached = !rejected && i <= currentIdx;
                      return (
                        <div key={s} className={cn("flex items-center", i < FLOW.length - 1 && "flex-1")}>
                          <div className="flex flex-col items-center">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border",
                              reached ? "border-success/40 bg-success/10 text-success" : "border-border bg-muted/40 text-muted-foreground")}>
                              {reached ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            </div>
                            <span className={cn("mt-1.5 text-[9px] font-bold uppercase tracking-wider", reached ? "text-success" : "text-muted-foreground")}>
                              {s}
                            </span>
                          </div>
                          {i < FLOW.length - 1 && (
                            <div className={cn("mx-1 mb-5 h-0.5 flex-1 rounded", i < currentIdx && !rejected ? "bg-success/50" : "bg-border/60")} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button onClick={() => { setStep("email"); setOtp(""); }}
              className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Track another email
            </button>
          </div>
        )}
      </main>
    </div>
  );
}