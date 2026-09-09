"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, Cookie, Settings2, X } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";

const CONSENT_KEY = "hirekarlo-analytics-consent";
type Consent = "accepted" | "rejected" | null;

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [loaded, setLoaded] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "rejected") setConsent(stored);
    } finally {
      setLoaded(true);
    }
  }, []);

  function save(next: Exclude<Consent, null>) {
    try {
      window.localStorage.setItem(CONSENT_KEY, next);
    } catch {
      // Privacy mode or browser policy may block local storage.
    }
    setConsent(next);
    setManageOpen(false);
  }

  if (!loaded) return null;

  return (
    <>
      {consent === "accepted" && <Analytics />}

      {!consent && !manageOpen && (
        <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                  <Cookie className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">We use cookies & analytics</p>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                    HireKarlo uses essential technologies to keep the service secure and working. With your permission,
                    we also use analytics to understand visits and improve the product. Read our{" "}
                    <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Privacy Policy</Link>{" "}
                    and <Link href="/cookies" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Cookie Policy</Link>.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <button onClick={() => save("rejected")} className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">Reject analytics</button>
                <button onClick={() => setManageOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                  <Settings2 className="h-3.5 w-3.5" aria-hidden="true" /> Manage
                </button>
                <button onClick={() => save("accepted")} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Accept analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {manageOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" className="w-full max-w-lg rounded-2xl border border-border/60 bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold" id="cookie-settings-title">Cookie settings</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose which optional analytics you allow. Essential technologies stay enabled because the site depends on them.</p>
              </div>
              <button onClick={() => setManageOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2"><Cookie className="h-4 w-4" aria-hidden="true" /></div>
                  <div>
                    <p className="text-sm font-semibold">Essential</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Required for authentication, security, OAuth flows and core site functionality.</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Always on</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><BarChart3 className="h-4 w-4" aria-hidden="true" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Analytics</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Vercel Web Analytics helps us understand aggregate site usage and improve HireKarlo.</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Optional</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => save("rejected")} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted">Reject analytics</button>
              <button onClick={() => save("accepted")} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90">Accept analytics</button>
            </div>
          </div>
        </div>
      )}

      {consent && (
        <button
          onClick={() => setManageOpen(true)}
          className="fixed bottom-4 left-4 z-[90] inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-3.5 py-2 text-xs font-semibold text-muted-foreground shadow-lg backdrop-blur hover:text-foreground"
          aria-label="Open cookie settings"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" /> Cookie settings
        </button>
      )}
    </>
  );
}
