"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Star, Loader2, HeartHandshake, CheckCircle2 } from "lucide-react";

import { submitInterviewExperienceRatingAction } from "@/actions/interview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function RateForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating) return toast.error("Select a star rating first.");
    setBusy(true);
    const res = await submitInterviewExperienceRatingAction(token, rating);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else setDone(true);
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        {done ? (
          <div className="relative z-10 space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Thank you!</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your feedback helps us make every interview better. Good luck with the rest of the process!
            </p>
            <Link href="/track" className="block text-sm font-semibold text-primary hover:underline">
              Track your application →
            </Link>
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                <HeartHandshake className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Rate your interview</h1>
              <p className="text-sm text-muted-foreground">
                How was your experience? Your answer is confidential.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      "h-9 w-9 transition-colors",
                      s <= (hover || rating) ? "fill-warning text-warning" : "text-border"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-semibold text-foreground h-5">
              {(hover || rating) > 0 ? LABELS[hover || rating] : ""}
            </p>

            <Button
              onClick={submit}
              disabled={busy || !token}
              className="h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit feedback"}
            </Button>
            {!token && (
              <p className="text-center text-xs text-destructive">This feedback link is missing its token.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RateInterviewPage() {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/hero-bg.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background" />
      </div>
      <Suspense fallback={null}>
        <RateForm />
      </Suspense>
    </div>
  );
}