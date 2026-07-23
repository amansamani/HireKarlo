"use client";

import { useState, startTransition, useRef } from "react";
import { toast } from "sonner";
import { CheckCircle2, User, Mail, UploadCloud, FileText, Loader2, ShieldCheck } from "lucide-react";
import { submitApplicationAction, sendApplicationOtpAction, verifyApplicationOtpAction } from "@/actions/public-apply";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const RESEND_COOLDOWN_SECONDS = 30;

export default function PublicJobApplyForm({
  jobId,
  jobTitle,
  jobMeta,
}: {
  jobId: string;
  jobTitle: string;
  jobMeta: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function resetEmailVerification() {
    setEmailVerified(false);
    setOtpSent(false);
    setOtp("");
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (emailVerified || otpSent) resetEmailVerification();
  }

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1 && cooldownTimer.current) {
          clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (!email || !email.includes("@")) {
      setErrors((prev) => ({ ...prev, email: "Please provide a valid email address" }));
      return;
    }
    setErrors((prev) => ({ ...prev, email: undefined }));
    setSendingOtp(true);
    const res = await sendApplicationOtpAction(email);
    setSendingOtp(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      setOtpSent(true);
      startCooldown();
      toast.success(res.success || "Verification code sent!");
    }
  }

  async function handleVerifyOtp() {
    if (otp.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setVerifyingOtp(true);
    const res = await verifyApplicationOtpAction(email, otp.trim());
    setVerifyingOtp(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      setEmailVerified(true);
      toast.success("Email verified!");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please provide your resume in PDF format only.");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobId", jobId);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (data.url) {
        setUploadedUrl(data.url);
        toast.success("Resume uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process resume upload.";
      toast.error(message);
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting) return;

    setErrors({});

    const formData = new FormData(e.currentTarget);
    const name = formData.get("candidateName") as string;

    if (!name || name.length < 2) {
      setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
      return;
    }
    if (!email || !email.includes("@")) {
      setErrors((prev) => ({ ...prev, email: "Please provide a valid email address" }));
      return;
    }
    if (!emailVerified) {
      toast.error("Please verify your email address first.");
      return;
    }
    if (!uploadedUrl) {
      toast.error("Please upload your resume before submitting.");
      return;
    }

    setSubmitting(true);

    startTransition(async () => {
      try {
        const res = await submitApplicationAction({
          jobId,
          candidateName: name,
          candidateEmail: email,
          resumeUrl: uploadedUrl,
          otp,
        });

        if (res?.error) {
          toast.error(res.error);
          setSubmitting(false);
        } else {
          toast.success("Applied successfully!");
          setSubmitted(true);
        }
      } catch (err) {
        console.error("Application submission threw:", err);
        toast.error("Something went wrong submitting your application. Please try again.");
        setSubmitting(false);
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md space-y-4 p-6 text-center shadow-xl">
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
            </span>
          </div>
          <CardTitle className="text-xl font-semibold">Application Received!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your profile and resume have entered our evaluation pipeline. We&apos;ll be in touch by email.
          </p>
          <Link href="/track" className="inline-block text-sm font-medium text-primary hover:underline underline-offset-4">
            Check your status anytime
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">{jobTitle}</CardTitle>
            <CardDescription>{jobMeta}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="candidateName" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <User className="h-3 w-3" aria-hidden="true" /> Full Name
                </label>
                <Input id="candidateName" name="candidateName" placeholder="Aman Samani" required aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="candidateEmail" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Mail className="h-3 w-3" aria-hidden="true" /> Email Address
                </label>
                <div className="flex gap-2">
                  <Input
                    id="candidateEmail"
                    name="candidateEmail"
                    type="email"
                    placeholder="aman@example.com"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={emailVerified}
                    aria-invalid={!!errors.email}
                    className="flex-1"
                  />
                  {emailVerified ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 text-xs font-medium text-success">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || resendCooldown > 0}
                      className="shrink-0 whitespace-nowrap text-xs"
                    >
                      {sendingOtp ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : resendCooldown > 0 ? (
                        `Resend (${resendCooldown}s)`
                      ) : otpSent ? (
                        "Resend code"
                      ) : (
                        "Send OTP"
                      )}
                    </Button>
                  )}
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}

                {otpSent && !emailVerified && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="flex-1 tracking-[0.3em]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otp.length !== 6}
                      className="shrink-0 text-xs font-semibold"
                    >
                      {verifyingOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Verify"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="resume-upload" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3 w-3" aria-hidden="true" /> Curriculum Vitae (PDF)
                </label>
                <div className="relative rounded-lg border border-dashed border-border bg-background/60 p-4 text-center transition-colors hover:border-primary/50">
                  <input
                    id="resume-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    disabled={uploading}
                    aria-describedby="resume-upload-hint"
                  />

                  {uploading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs text-muted-foreground">Uploading your document...</p>
                    </div>
                  ) : fileName ? (
                    <div className="flex flex-col items-center justify-center space-y-1 py-1">
                      <FileText className="h-6 w-6 text-success" aria-hidden="true" />
                      <p className="max-w-[220px] truncate text-xs font-medium text-foreground">{fileName}</p>
                      <p id="resume-upload-hint" className="text-[10px] text-muted-foreground">Tap to replace this file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs font-medium text-foreground">Click or drag PDF resume here</p>
                      <p id="resume-upload-hint" className="text-[10px] text-muted-foreground">Max size allowed up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={uploading || submitting} className="mt-2 w-full font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}