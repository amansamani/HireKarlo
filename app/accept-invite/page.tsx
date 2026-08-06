"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import { UserPlus, Loader2, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

import { acceptInviteAction } from "@/actions/team";
import { Button } from "@/components/ui/button";

function AcceptCard() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // ✅ FIXED — the action takes exactly ONE argument (the token string)
  async function accept() {
    setBusy(true);
    const res = await acceptInviteAction(token);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      setDone(true);
      toast.success("Welcome to the team!");
      setTimeout(() => (window.location.href = "/dashboard"), 900);
    }
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            {done ? <ShieldCheck className="h-8 w-8 text-success" /> : <UserPlus className="h-8 w-8 text-primary" />}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {done ? "You're in!" : "Join your team"}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {done
                ? "Your account is ready — taking you to the dashboard…"
                : "You've been invited to collaborate on HireKarlo. Accept to get access to your team's pipeline."}
            </p>
          </div>

          {!done && (
            <Button
              onClick={accept}
              disabled={busy || !token}
              className="group h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Accept invitation
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          )}

          {!token && (
            <p className="text-xs text-destructive">This invite link is missing its token.</p>
          )}

          <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] text-muted-foreground">
              Your role & permissions are set by the recruiter who invited you.
            </p>
          </div>

          <Link href="/login" className="block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Go to login instead
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/hero-bg.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background" />
      </div>
      <Suspense fallback={null}>
        <AcceptCard />
      </Suspense>
    </div>
  );
}