import { createHash } from "crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readBoundedBody } from "@/lib/bounded-body";
import { RazorpayInvoiceSchema, RazorpayPaymentSchema, razorpayRequest, validRazorpaySignature } from "@/lib/razorpay";
import { syncRazorpayAgreement } from "@/lib/razorpay-sync";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
const Entity = z.object({ id: z.string(), notes: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown()).length(0).transform((): Record<string, unknown> => ({}))]).nullish(), payment_id: z.string().optional() });
const Event = z.object({ event: z.string(), payload: z.object({ subscription: z.object({ entity: Entity }).optional(), payment: z.object({ entity: Entity }).optional(), refund: z.object({ entity: Entity }).optional() }) });

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new NextResponse("Billing unavailable", { status: 503 });
  let body: Uint8Array;
  try { body = await readBoundedBody(request, 1_000_000); } catch { return new NextResponse("Too large", { status: 413 }); }
  if (!validRazorpaySignature(body, request.headers.get("x-razorpay-signature"), secret)) return new NextResponse("Invalid signature", { status: 400 });
  let decoded: unknown;
  try { decoded = JSON.parse(new TextDecoder().decode(body)); } catch { return new NextResponse("Invalid event", { status: 400 }); }
  const parsed = Event.safeParse(decoded);
  if (!parsed.success) return new NextResponse("Invalid event", { status: 400 });
  const event = parsed.data;
  if (!event.event.startsWith("subscription.") && !["payment.captured", "payment.failed", "refund.created", "refund.processed", "refund.failed"].includes(event.event)) return NextResponse.json({ received: true });
  // The digest is covered by the HMAC; changing an unsigned event-id header cannot bypass replay detection.
  const eventKey = `razorpay:${createHash("sha256").update(body).digest("hex")}`;
  try {
    if (await prisma.billingEvent.findUnique({ where: { id: eventKey } })) return NextResponse.json({ received: true });
    let subId = event.payload.subscription?.entity.id;
    const paymentId = event.payload.payment?.entity.id || event.payload.refund?.entity.payment_id;
    if (!subId && paymentId && /^pay_[a-zA-Z0-9]+$/.test(paymentId)) {
      const payment = RazorpayPaymentSchema.parse(await razorpayRequest(`payments/${paymentId}`));
      if (payment.invoice_id) {
        const invoice = RazorpayInvoiceSchema.safeParse(await razorpayRequest(`invoices/${payment.invoice_id}`));
        if (invoice.success) subId = invoice.data.subscription_id;
      }
    }
    if (!subId || !/^sub_[a-zA-Z0-9]+$/.test(subId)) return NextResponse.json({ received: true });
    let agreement = await prisma.razorpayAgreement.findUnique({ where: { providerSubscriptionId: subId } });
    const intentId = event.payload.subscription?.entity.notes?.hirekarloIntentId;
    if (!agreement && typeof intentId === "string") agreement = await prisma.razorpayAgreement.findUnique({ where: { id: intentId } });
    if (!agreement) return NextResponse.json({ received: true }); // Other products on the merchant account.
    await syncRazorpayAgreement(agreement.id, eventKey, paymentId);
    return NextResponse.json({ received: true });
  } catch (error) { logError("billing.razorpay_webhook_failed", error); return new NextResponse("Retry later", { status: 500 }); }
}
