# Razorpay setup for HireKarlo

This integration uses recurring monthly subscriptions in INR. It is prepared for **Test Mode**. No actual Razorpay account, payment or webhook delivery has been verified until you finish the checks below. Existing Stripe code remains available via `BILLING_PROVIDER=stripe`.

## 1. Save credentials privately

In the project root `.env`, enter your Test Mode credentials:

```dotenv
BILLING_PROVIDER=razorpay
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_private_key_secret
RAZORPAY_WEBHOOK_SECRET=your_separate_random_webhook_secret
RAZORPAY_PLAN_STARTER_INR=
RAZORPAY_PLAN_GROWTH_INR=
RAZORPAY_PLAN_AGENCY_INR=
```

The local `.env` has placeholders and a generated webhook secret. Keep that generated value. The webhook secret is different from your API key secret. Do not share either secret in chat or commit `.env`; `.gitignore` excludes it. All three secrets are server settings, without a `NEXT_PUBLIC_` prefix.

## 2. Prepare Test Mode plans

Use Node 24 LTS (or a supported Node 22 release with type stripping). From the project folder:

```powershell
npm run razorpay:setup
```

This checks credentials and creates or reuses three Test Mode monthly plans using the application's prices: Starter ₹1,499, Growth ₹3,999 and Agency ₹7,999. It writes their plan IDs into your private `.env`. It does not create a subscription, charge anyone or send customer messages. Creation never automatically retries; rerunning searches for the exact existing plan before creating one. If a request fails ambiguously, allow the dashboard to settle, check for the plan, and rerun. Resolve duplicate matches by choosing one plan ID manually.

```powershell
npm run razorpay:check
```

This second command only reads plan settings and checks prices/currency/interval. Success does **not** confirm webhook delivery, Subscriptions account eligibility or payment capture. Razorpay may require Subscriptions activation for your account even when API keys work.

## 3. Configure payment notifications

Use a public HTTPS staging URL, or a temporary HTTPS tunnel to your development app while testing. Configure a **Test Mode** webhook in the Razorpay dashboard:

```text
https://YOUR-STAGING-DOMAIN/api/billing/razorpay/webhook
```

Copy the value of `RAZORPAY_WEBHOOK_SECRET` from your local file into the webhook's Secret field. Subscribe to available lifecycle events: `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, `subscription.completed`; also `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, `refund.failed`. Unsupported events are safely acknowledged. Keep the app reachable while sending tests. `localhost` alone cannot receive Razorpay's callbacks.

The owner can use **Refresh payment status** while testing locally without a public webhook. Production requires both webhook delivery and the recovery job.

## 4. Run the app and test as an owner

Restart the app after changing `.env`:

```powershell
npm run dev
```

1. Sign in as a company owner and open **Billing & usage**. Confirm the Test payments banner.
2. Choose a plan. The app creates one subscription agreement and opens HireKarlo's checkout page. Click **Pay with Razorpay** to open Razorpay Standard Checkout.
3. Use Razorpay's current documented test payment details. Do not enter real payment details for this test.
4. Successful checkout sends a subscription callback to HireKarlo. The server checks its HMAC using the API key secret and the subscription ID from the stored tenant agreement, then fetches the subscription, paid invoice and captured payment before returning to billing. A browser redirect or authenticated mandate alone never activates a paid plan. If confirmation is delayed, use **Refresh payment status**. If a bank/UPI app interrupts the browser callback, close checkout and use **Check payment and return**, or open billing manually and refresh; do not create another agreement to retry a successful charge.
5. Confirm the correct plan, paid-through date and payment record. Refresh again: no duplicate payment records or agreements should appear.
6. In Test Mode, exercise failed payment, delayed/retried webhook, renewal and cancellation scenarios. An active cancellation ends renewal and retains already verified paid access until the paid-through date. Full refunds revoke the corresponding paid period; partial refunds keep access. Subscription cancellation does not itself issue a refund.
7. Confirm admins can view billing but only owners can buy, cancel or refresh it. Check another company cannot see this company's payments.

## 5. Deploy reliable recovery

Apply migrations with `npm run db:deploy`, then build with `npm run build`. Never use `prisma db push` against an established database. Keep a restorable backup first.

Configure a secret `CRON_SECRET`; call `/api/cron/billing-reconciliation` once a minute with `Authorization: Bearer <CRON_SECRET>`. The job checks two due agreements per run and reschedules each successful agreement for 15 minutes later. Size worker capacity to tenant count (this initial schedule supports roughly 30 active agreements per 15-minute sweep); increase batch/worker capacity before scaling. Failed requests are retried, and ambiguous subscription creation is recovered using the persisted intent rather than blindly repeated.

`vercel.json` has daily preview schedules. For a commercial host, use `vercel.production.json` as the deployment configuration or configure an equivalent scheduler. Daily recovery is inadequate for production billing. Configure functions to allow 60 seconds and monitor errors and stale billing recovery through the protected `/api/ops/health` endpoint. Keep provider availability and actual webhook delivery checks separate from configuration-presence checks.

## 6. Switch to real payments only after approval and staging validation

Use a separate production database and **Live Mode** credentials. Set `RAZORPAY_MODE=live`, set the live key pair, create equivalent INR monthly plans in the live dashboard and configure their distinct IDs. Run `npm run razorpay:check`. The automatic setup command deliberately creates only Test Mode plans. Configure a separate live webhook secret and HTTPS webhook URL. Do not copy test subscriptions into the live database or change test keys on a database containing active real customers.

Complete Razorpay activation/Subscriptions eligibility, company contact and support details, clear pricing and cancellation/refund policies, tax/invoice arrangements and the broader launch guide before accepting real customers. Do not infer Live approval from possession of Test Mode keys.

## Implemented behavior and limits

- Hosted checkout keeps card and mandate entry with Razorpay. HMAC is checked over the exact webhook bytes. All entitlement decisions use fresh provider reads and tenant ownership/plan checks, with database locks, duplicate-event handling and a durable agreement record.
- Creation is limited to one pending subscription per company. Do not delete a pending database row to work around an error. Use Refresh, cancel the unpaid checkout, or investigate the provider agreement. An uncertain creation that cannot be found needs operator review. Account key rotation also requires review: saved agreements bind to the creating key ID and will not silently migrate to another account/key.
- New checkouts use Razorpay Standard Checkout inside HireKarlo and return automatically after verification. Old standalone subscription links still require a manual return. Browser callback failure does not discard the agreement; manual verification, signed webhooks and reconciliation remain available.
- Agreements run for up to 120 monthly cycles unless cancelled sooner. INR only for Razorpay. Plan changes/proration, coupons, add-ons, automated refund issuance and self-service payment-method changes are not implemented. Do not change a live provider plan out of band; mismatched plans fail closed.
- Existing Stripe customers require an operator-managed migration to Razorpay; changing the provider setting does not migrate subscriptions or permit duplicate billing.
- The app displays verified payment records, not GST/tax invoices. The displayed price must match the total provider invoice charge. Extra taxes/add-ons require a deliberate pricing implementation. Use your agreed invoicing process before live launch.
- Recovery records the most recent paid cycle and payments referenced by received events; it is not a complete historical accounting import. Financial reporting must reconcile against Razorpay settlements, fees and refunds. Very large histories (300+ invoices or 200+ candidate subscriptions during lost-response recovery) require operator review.
- Payment reminders/dunning emails and settlement reporting are not added here. Configure and verify the provider's customer notifications separately. `customer_notify=0` prevents unsolicited messages during agreement creation.

## Official references

- [Subscriptions API](https://razorpay.com/docs/api/payments/subscriptions/)
- [Subscription invoice API](https://razorpay.com/docs/api/payments/subscriptions/fetch-invoices/)
- [Webhook validation](https://razorpay.com/docs/webhooks/validate-test/)
- [Subscription testing](https://razorpay.com/docs/payments/subscriptions/test/)
