# Deployment and operating runbook

The application and backend are one Next.js service. Vercel hosts the web/functions; PostgreSQL stores tenant and work queues; SMTP delivers email, Cloudinary stores new private resumes, Gemini optionally reviews them and Google optionally creates calendar events. Stripe is optional and currently unconfigured. Separate environment credentials and databases are required.

## Configuration

Copy `.env.example` for local use; configure secrets privately in the hosting dashboard for deployment. Do not commit `.env`.

| Variables | Requirement / purpose |
|---|---|
| `DATABASE_URL` | Core PostgreSQL connection; use provider pool and verified TLS for remote databases |
| `AUTH_SECRET` | Core unpredictable random secret, at least 32 characters; keep stable across instances |
| `NEXT_PUBLIC_APP_URL` | Core full origin; HTTPS for a public production domain; exact callback/link origin |
| `AUTH_TRUST_HOST` | Use only on a trusted hosting/proxy setup; CI/Vercel use true |
| `DATABASE_POOL_MAX` | Optional per-process cap 1–20, default 5; monitor total instance connections |
| `PILOT_SIGNUP_EMAILS` | Optional comma-separated normalized email allowlist; empty permits public signup |
| `EMAIL_USER`, `EMAIL_PASS` | SMTP account/app password; required for delivered verification and notifications |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Optional SMTP configuration; defaults Gmail, 465, true; align security mode with your provider |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Applicant resume storage and signed downloads |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional AI; configure a model enabled on your account; provider calls occur after intake commit |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY` | Optional calendar OAuth; strong stable encryption key; register callback `/api/auth/google-calendar/callback` |
| `CRON_SECRET` | Private random bearer secret used by all recovery/reminder/cleanup routes |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional billing; keep disabled until merchant and lifecycle tests pass |
| `STRIPE_PRICE_{STARTER,GROWTH,AGENCY}_{INR,USD}` | Six optional monthly recurring price IDs; amounts/currencies must match `lib/plans.ts` |
| `STRIPE_AUTOMATIC_TAX` | Optional; enable only after merchant tax setup is verified |
| `SEED_DEMO_PASSWORD` | Local-only optional seed password; never a hosted account credential |

The health endpoint checks **core** configuration and a database query only. HTTP 200 does not prove SMTP, AI, OAuth, document privacy, payments or migration compatibility. Core configuration problems/database unavailability return generic 503 without credentials.

## Release sequence

1. Review `MASTER-CHECKLIST.md` and `FINAL-CTO-REVIEW.md`; resolve the applicable release gates. Current changes are local and need a reviewed commit/push.
2. On a separate staging database, install with `npm ci`, run preflight, replay migrations, run tests and build. `npm run build` generates Prisma and builds Next; **it does not migrate**.
3. Verify a current live backup and restore plan. Run `npm run db:preflight` with the intended live connection privately. This pass's read-only preflight passed, but it does not replace a release-window check.
4. Apply pending migration `20260917000000_reliability_guards` in a controlled release window with `npm run db:deploy` against the intended database. Deploy code that uses the new columns/table only after the migration succeeds. Do not use `migrate reset` or `db push` on live data.
5. Configure Vercel environment scopes correctly, including public origin, secrets and pooled database. Build command `npm run vercel-build`; framework Next.js. A GitHub push can trigger deployment only after repository integration, permissions, environment and migration are correct.
6. Inspect deployment logs and health, then sign in with a staging/test business account and run the production smoke procedure in `testing.md`. Verify tenant denial, signed documents, email and each enabled provider using synthetic records.
7. Record release commit/deployment ID, migration result and smoke evidence; retain rollback target and backup. CI configuration exists, but an actual hosted CI run/deployment was not triggered in this pass.

## Current free-hosting mode

The current Vercel Hobby account is a personal/noncommercial preview. Keep `vercel.json` daily schedules. `vercel.production.json` is only a frequent-scheduling template for a suitable commercial host; copying it does not upgrade hosting or make commercial use compliant. No purchase, upgrade or payment activation was performed. See [Vercel Hobby terms](https://vercel.com/docs/plans/hobby) and [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) when choosing the eventual host.

Immediate work uses Next.js `after`; email/AI jobs are already persisted if the function is interrupted. Daily fallback can delay recovery by a day. AI recovery processes one job per invocation; default daily scheduling is not adequate for a commercial throughput/SLA promise. Preview reminders enqueue up to 100 upcoming interviews in a 24-hour window, not exact-time delivery. Platform delays, queues and delivery retries can make reminders late. Do not advertise guaranteed reminders or immediate AI results under this setup.

## Monitoring and failures

Monitor health and host errors, connection saturation, queue backlog age, expired leases/dead letters, provider rate limits and costs. Logs provide fixed JSON event codes; never enable raw credential/provider-response logging. Operators with private DB access can inspect aggregate queue status:

```sql
SELECT count(*) AS pending, min("createdAt") AS oldest
FROM "EmailOutbox" WHERE "sentAt" IS NULL AND "failedAt" IS NULL;
SELECT count(*) AS dead_letters FROM "EmailOutbox" WHERE "failedAt" IS NOT NULL;
SELECT count(*) AS pending, min("createdAt") AS oldest
FROM "AiScoringJob" WHERE "completedAt" IS NULL AND "failedAt" IS NULL;
SELECT "lastErrorCode", count(*) FROM "AiScoringJob"
WHERE "failedAt" IS NOT NULL GROUP BY "lastErrorCode";
```

Investigate provider credentials/quota and schema first. A failed AI job can be requeued by an authorized hiring user; this can consume more attempts. Email dead letters require an operator-reviewed retry after fixing the cause; do not blindly replay expired verification/reset links. SMTP delivery is at least once. Calendar integration is best effort and is not a durable event-reconciliation system.

## Rollback

Keep the last verified deployment. Roll back application code only when compatible with the current schema; pause risky writes if needed. New additive columns/queue tables can remain while reverting compatible application code, but retention/FK behavior has changed. Never delete or rewrite applied migrations. Use a forward corrective migration for a schema defect, or an isolated verified restore plus deliberate traffic/write cutover for disaster recovery. Live restore rehearsal, monitoring alerts, provider privacy migration and payment smoke remain external gates.
