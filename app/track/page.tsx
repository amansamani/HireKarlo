"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck, Briefcase, Clock } from "lucide-react";
import { sendApplicationOtpAction, getApplicationStatusAction } from "@/actions/public-apply";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppStatus = { stage: string; appliedDate: string; job: { title: string; department: string } };

const STAGE_LABELS: Record<string, string> = {
  APPLIED: "Application received", SCREENING: "In screening", TECHNICAL: "Technical round",
  HR: "HR round", OFFER: "Offer extended", HIRED: "Hired", REJECTED: "Not moving forward",
};

export default function TrackApplicationPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<AppStatus[] | null>(null);

  async function handleSendOtp() {
    if (!email.includes("@")) { toast.error("Enter a valid email."); return; }
    setSending(true);
    const res = await sendApplicationOtpAction(email);
    setSending(false);
    if (res.error) toast.error(res.error);
    else { setOtpSent(true); toast.success("Code sent — check your inbox."); }
  }

  async function handleCheckStatus() {
    if (otp.trim().length !== 6) { toast.error("Enter the 6-digit code."); return; }
    setLoading(true);
    const res = await getApplicationStatusAction(email, otp.trim());
    setLoading(false);
    if (res.error) toast.error(res.error);
    else setApplications(res.applications ?? []);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>Check your application status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!applications ? (
            <>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" disabled={otpSent} />
              </div>
              {!otpSent ? (
                <Button className="w-full" onClick={handleSendOtp} disabled={sending}>
                  {sending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Send code
                </Button>
              ) : (
                <>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} className="pl-9" maxLength={6} />
                  </div>
                  <Button className="w-full" onClick={handleCheckStatus} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} View status
                  </Button>
                </>
              )}
            </>
          ) : applications.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No applications found for this email.</p>
          ) : (
            <div className="space-y-2">
              {applications.map((app, i) => (
                <div key={i} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold"><Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> {app.job.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden="true" /> Applied {new Date(app.appliedDate).toLocaleDateString()}
                  </div>
                  <div className="mt-1.5 inline-block rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    {STAGE_LABELS[app.stage] ?? app.stage}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}