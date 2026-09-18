"use client";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import Script from "next/script";
import Link from "next/link";
import { useRef, useState } from "react";
import { completeRazorpayCheckoutAction } from "@/actions/billing";

type Options = { key: string; subscription_id: string; name: string; description: string; handler: (response: unknown) => void; modal: { ondismiss: () => void }; theme: { color: string } };
type Checkout = { open: () => void; on: (event: string, handler: () => void) => void };
type CheckoutWindow = Window & { Razorpay?: new (options: Options) => Checkout };

export default function RazorpayCheckout(props: { agreementId: string; subscriptionId: string; keyId: string; planName: string; amount: number; testMode: boolean }) {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const confirming = useRef(false);
  const [verifying, setVerifying] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  async function finish(callback?: unknown) {
    if (confirming.current) return;
    confirming.current = true; setVerifying(true); setBusy(true); setMessage("Checking payment with Razorpay…");
    let destination = "/dashboard/billing?error=review";
    try {
      const result = await completeRazorpayCheckoutAction(props.agreementId, callback);
      if (result.status !== "error") destination = `/dashboard/billing?checkout=${result.status}`;
    } catch { /* Network interruption: billing retains its manual recovery control. */ }
    window.location.assign(destination);
  }
  function pay() {
    const Razorpay = (window as CheckoutWindow).Razorpay;
    if (!Razorpay || busy) return;
    setBusy(true); setMessage("");
    try {
      const checkout = new Razorpay({ key: props.keyId, subscription_id: props.subscriptionId, name: "HireKarlo", description: `${props.planName} monthly subscription`, handler: response => { void finish(response); }, modal: { ondismiss: () => { if (!confirming.current) { setBusy(false); setMessage("Checkout closed. If payment succeeded, check its status below before trying again."); } } }, theme: { color: "#527500" } });
      checkout.on("payment.failed", () => { if (!confirming.current) setMessage("Payment was not completed. Use a payment method eligible for recurring payments. You can retry in Razorpay or close checkout and return to billing."); });
      checkout.open();
    } catch { setBusy(false); setMessage("Checkout could not open. Check your connection, then reload this page."); }
  }
  return <section className="mx-auto max-w-xl space-y-5 rounded-3xl border border-border bg-card/70 p-6 shadow-xl sm:p-9">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => { setReady(true); setScriptFailed(false); }} onError={() => { setReady(false); setScriptFailed(true); setMessage("Razorpay could not load. Reload this page, or check payment status below if you already paid."); }}/>
    <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><ShieldCheck aria-hidden="true" /></div><p className="eyebrow">Secure checkout</p><h1 className="text-3xl font-semibold tracking-tight">Complete your subscription</h1>
    <p>{props.planName} · ₹{(props.amount / 100).toLocaleString("en-IN")} per month</p>
    {props.testMode && <p className="rounded-lg bg-muted p-4">Test payments only. No real money is collected. Use Razorpay’s subscription test payment details.</p>}
    <p>Pay securely with Razorpay. After a successful payment, you will return to HireKarlo automatically while we verify your subscription.</p>
    <button aria-busy={(!ready && !scriptFailed) || busy} onClick={pay} disabled={!ready || busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{((!ready && !scriptFailed) || busy) && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{busy ? "Payment in progress…" : ready ? "Pay with Razorpay" : scriptFailed ? "Checkout unavailable" : "Loading Razorpay…"}</button>
    {scriptFailed && <button onClick={() => window.location.reload()} className="min-h-11 rounded-xl border px-4 text-sm">Reload checkout</button>}
    {message && <p role="status" className="rounded-xl border bg-background/60 p-4 text-sm leading-relaxed">{message}</p>}
    <p className="text-sm text-muted-foreground">If a bank or UPI app completed payment but this screen did not update, check the payment before paying again.</p>
    <button aria-busy={verifying} onClick={() => { void finish(); }} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 disabled:opacity-40">{verifying && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Check payment and return</button>
    <Link href="/dashboard/billing" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true"/>Back to billing</Link>
    <p className="text-sm text-muted-foreground">Monthly renewals continue until cancelled or the 120-cycle agreement completes. A card must support recurring payments. Closing checkout keeps your pending agreement available for recovery.</p>
  </section>;
}
