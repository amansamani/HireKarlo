"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  MapPin, Building2, Clock, UploadCloud, FileText, X, Sparkles,
  ShieldCheck, CheckCircle2, Loader2, MailCheck, ArrowLeft,
} from "lucide-react";

import {
  sendApplicationOtpAction,
  submitApplicationAction,
} from "@/actions/public-apply";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PublicJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  status: string;
};

export default function PublicApplyClient({ job }: { job: PublicJob }) {
  const [step, setStep] = useState<"form" | "otp" | "done">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [otp, setOtp] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    const ok = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type);
    if (!ok) return toast.error("Only PDF, DOC or DOCX files are accepted.");
    if (f.size > 5 * 1024 * 1024) return toast.error("Resume must be under 5 MB.");
    setFile(f);
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return toast.error("Please fill in your name and email.");
    if (!file) return toast.error("Please attach your resume.");
    setBusy(true);
    const res = await sendApplicationOtpAction(email.trim());
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(`Verification code sent to ${email.trim()}.`);
      setStep("otp");
    }
  }

async function verifyAndSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (otp.trim().length !== 6) return toast.error("Enter the 6-digit code from your email.");
  if (!file) return toast.error("Please attach your resume.");
  setBusy(true);

  let resumeUploadId: string | undefined;
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("jobId", job.id);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    const upJson = await up.json();
    if (!up.ok || !upJson?.uploadId) {
      toast.error(upJson?.error ?? "Resume upload failed.");
      setBusy(false);
      return;
    }
    resumeUploadId = upJson.uploadId;
  } catch {
    toast.error("Resume upload failed. Please try again.");
    setBusy(false);
    return;
  }

  const res = await submitApplicationAction({
    jobId: job.id,
    candidateName: fullName.trim(),
    candidateEmail: email.trim(),
    resumeUploadId,
    otp: otp.trim(),
  });

  setBusy(false);
  if (res?.error) toast.error(res.error);
  else setStep("done");
}

  return (
    <div className="relative isolate min-h-dvh">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/hero-bg.webp" alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
      </div>

      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.webp" alt="HireKarlo" width={112} height={28} className="h-7 w-auto object-contain" priority />
        </Link>
        <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> No account needed
        </span>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {step === "done" ? (
          <div className="animate-in fade-in zoom-in-95 duration-500 rounded-3xl border border-success/30 bg-card/70 backdrop-blur-xl p-12 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">Application received!</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Our AI is already scoring your resume against the role. You&apos;ll get an email every time your application moves a stage.
            </p>
            <Link href="/track" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
              Track your application →
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Job summary */}
            <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Hiring now
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-tight">{job.title}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5"><Building2 className="h-3.5 w-3.5" /> {job.department}</span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5"><Clock className="h-3.5 w-3.5" /> {job.type.replace("_", " ").toLowerCase()}</span>
                </div>
                <div className="mt-5 whitespace-pre-line border-t border-border/40 pt-5 text-sm leading-relaxed text-muted-foreground">
                  {job.description}
                </div>
              </div>
            </div>

            {step === "form" ? (
              <form onSubmit={sendOtp} className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-xl space-y-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-bold tracking-tight">Apply in under a minute</h2>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full name</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Priya Sharma"
                      className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resume</label>
                  <button type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                    className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 transition-all duration-200 ${
                      dragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-border/60 bg-background/40 hover:border-primary/50 hover:bg-primary/5"
                    }`}>
                    <UploadCloud className={`h-8 w-8 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{file ? file.name : "Drop your resume here or click to browse"}</p>
                    <p className="text-[11px] text-muted-foreground">PDF, DOC or DOCX · max 5 MB</p>
                  </button>
                  <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                  {file && (
                    <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
                      <span className="flex items-center gap-2 text-xs font-medium text-primary">
                        <FileText className="h-3.5 w-3.5" /> {file.name} · {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button type="button" onClick={() => setFile(null)} className="text-primary/70 hover:text-primary" aria-label="Remove file">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={busy}
                  className="h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01]">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue — email me a code"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verifyAndSubmit} className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-xl space-y-5">
                <div className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-bold tracking-tight">Verify your email</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  We sent a one-time code to <span className="font-semibold text-foreground">{email}</span>.
                </p>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  className="h-14 rounded-xl border-border/60 bg-background/50 text-center text-2xl font-bold tracking-[0.5em] focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
                <Button type="submit" disabled={busy}
                  className="h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & submit application"}
                </Button>
                <button type="button" onClick={() => setStep("form")}
                  className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Edit application
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}