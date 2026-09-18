"use client";
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
  async function finish(callback?: unknown) {
    if (confirming.current) return;
    confirming.current = true; setBusy(true); setMessage("Checking payment with Razorpay…");
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
  return <main className="mx-auto max-w-xl space-y-5 p-6">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => { setReady(false); setMessage("Razorpay could not load. Reload this page, or check payment status below if you already paid."); }}/>
    <h1 className="text-3xl font-bold">Complete your subscription</h1>
    <p>{props.planName} · ₹{(props.amount / 100).toLocaleString("en-IN")} per month</p>
    {props.testMode && <p className="rounded-lg bg-muted p-4">Test payments only. No real money is collected. Use Razorpay’s subscription test payment details.</p>}
    <p>Pay securely with Razorpay. After a successful payment, you will return to HireKarlo automatically while we verify your subscription.</p>
    <button onClick={pay} disabled={!ready || busy} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-40">{busy ? "Payment in progress…" : ready ? "Pay with Razorpay" : "Loading Razorpay…"}</button>
    {message && <p role="status">{message}</p>}
    <p className="text-sm text-muted-foreground">If a bank or UPI app completed payment but this screen did not update, check the payment before paying again.</p>
    <button onClick={() => { void finish(); }} disabled={busy} className="rounded-lg border border-border px-4 py-2 disabled:opacity-40">Check payment and return</button>
    <Link href="/dashboard/billing" className="block text-primary underline">Back to billing</Link>
    <p className="text-sm text-muted-foreground">Monthly renewals continue until cancelled or the 120-cycle agreement completes. A card must support recurring payments. Closing checkout keeps your pending agreement available for recovery.</p>
  </main>;
}
