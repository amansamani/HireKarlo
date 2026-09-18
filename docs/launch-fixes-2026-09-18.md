# Production core fixes — 18 September 2026

This release improves the local application. It does not certify a deployed service or activate payment processing. The existing `.env` is preserved. Database migration, hosting configuration and provider acceptance must precede public launch.

## What changed

| Area | Result |
|---|---|
| Hiring pipeline | Offers advance to Hired; hired and historical stages remain visible; terminal outcomes do not accidentally advance into rejection. Repeated same-stage requests do not duplicate notifications/history. |
| Day-to-day editing | Hiring staff can edit opening details and candidate profiles/notes; owners/admins can rename the workspace. Both mobile and desktop candidate lists link to the editor. |
| Team operations | The active Team page exposes Calendar connection and bios. Pending invitations use real stored IDs and can be revoked by owners/admins. |
| Workspace/auth | Invalid selected-workspace cookies fall back only to a current membership. Login sessions bind to the authenticated password version, preserving revocation during a concurrent password reset. |
| Plans | Intake/public listings, stage changes, scheduling and editors check active entitlement. Closing/archiving jobs and removing access remain available after expiry. Existing interview feedback and data reads remain available to finish commitments. |
| Billing transactions | A checkout intent commits its exact request and idempotency key before the provider call. Retries recover remote success/local-write failure. A different plan cannot silently reuse the prior checkout. Cancellation expires the provider session before clearing the intent. Ambiguous old/completed sessions require reconciliation. |
| Audit records | New workspace-scoped administrative history records job creation/edit/status/archive, candidate edits/exports, clients, workspace selection/rename, invitation/membership changes, Calendar disconnection and checkout intent actions. Existing candidate activity history remains separate. |
| Notifications | Application receipts are durably queued in the intake transaction. Time-sensitive verification/reset/OTP/invite/feedback/interview emails carry expiration bounds, preventing stale retry delivery. Delivery remains at least once. |
| Bearer links | New verification, reset, invite and feedback tokens are hashed in their token tables. Existing raw links remain usable until their short expiration. A stored hash cannot be submitted as the raw bearer. |
| File handling | Upload and webhook requests enforce actual streamed byte limits. PDF/DOCX extraction runs in a worker with a ten-second deadline and a bounded V8 heap. Provider download limits and DOCX validation remain active. |
| Operations | AI recovery takes up to two jobs per invocation; email recovery has an explicit runtime budget. `/api/ops/health` provides secret-protected configuration/backlog/dead-letter counts without credentials or candidate data. |
| Product accuracy | Analytics labels match counted data; marketing/candidate-feedback copy avoids claiming anonymity, immutable logs, universal Calendar availability or guaranteed AI. |

## Database and deployment order

New migration: `prisma/migrations/20260918000000_launch_workflows/migration.sql`. It adds checkout recovery fields, email expiry and `AuditEvent`. It does not delete customer rows. The live database may have earlier pending migrations too; use Prisma's migration status rather than assuming only this migration is outstanding.

1. Select the actual production host, domain and payment provider. Keep payment checkout disabled until merchant approval, provider configuration and lifecycle tests are complete.
2. Back up the intended database, record the current app release and verify a restore into a separate database. A local synthetic restore is useful evidence, not proof of your hosted backup policy.
3. Configure a separate staging database and private environment values. Run `npm ci`, `npm run db:preflight`, `npm run db:deploy`, `npm run typecheck`, `npm run lint`, `npm test`, the isolated integration suite and `npm run build`.
4. For the production release window, check pending migration status and apply `npm run db:deploy` against the intended connection. Build/start the new release after successful migration. Neither `npm run build` nor client generation applies database migrations. Never use reset or `db push` on customer data.
5. Configure frequent authenticated recovery jobs. `vercel.json` still contains daily preview schedules; it is **not an adequate commercial recovery schedule**. `vercel.production.json` is a proposed frequent schedule, subject to the selected host's limits. For another host, call the same routes with the private `CRON_SECRET` bearer. Exercise them in staging and measure backlog under expected traffic.
6. Use `/api/health` for core uptime and `/api/ops/health` with the cron bearer for private operational checks. Configure alerts on non-200 status, increasing backlog, dead letters, host errors and database saturation. The private endpoint checks whether configuration exists; it does not authenticate with providers. Failed-count fields need their own alert policy; expired emails also count as failed.
7. Verify every enabled provider with synthetic records on the actual host. Record evidence before opening signup beyond a pilot. Use `PILOT_SIGNUP_EMAILS` while access should be restricted.

## Required acceptance checks

- Sign up, receive verification, sign in, reset a password and prove the old session no longer works.
- Create a workspace/job; apply using verified candidate email and a private resume; receive the receipt; edit the candidate; advance to offer/hired; verify status tracking.
- Invite and revoke a teammate, accept an invitation, remove membership, prove interviewer restrictions and cross-workspace denial.
- Download a private resume as an authorized user and prove an untrusted direct link cannot read it. Inventory **legacy public Cloudinary assets** and migrate their delivery/access mode before treating all historical documents as private.
- Exercise email recovery after deliberately interrupting a test request. Confirm SPF/DKIM/DMARC, sender identity and delivery behavior with the selected mail provider. Do not send operational test emails to real candidates.
- Payment test mode: successful payment, failed payment, duplicate/reordered/retried signed webhooks, remote success/local write failure, checkout cancellation, portal changes, upgrade/downgrade, renewal, cancellation, refund/dispute handling and tax/invoice correctness. Razorpay INR subscriptions have since been added alongside Stripe; follow [Razorpay setup](razorpay-setup.md). Real account and payment checks remain pending; automated tests use a simulated provider.
- Calendar, if enabled: connect with the exact HTTPS callback, schedule/cancel a synthetic interview, inspect both calendar and app, test token refresh and provider failures. Calendar remains best effort; durable external-event reconciliation is still required before promising guaranteed synchronization. Old plaintext refresh tokens need a controlled encryption migration/reconnection.
- AI, if enabled: verify the configured model/account, quotas, document parsing and recovery timing. Human hiring review remains necessary. Worker memory limits are not malware scanning or a complete native-memory sandbox.
- Restore a hosted backup, verify retention/PITR and monitoring, and rehearse rollback. New hashed links will not work with pre-release code that only supports raw tokens; avoid rolling auth flows back blindly, and issue replacement links if needed.

## What still requires product/operations work

- Live provider credentials/approval, production domain/host, staging/release automation, paid scheduler capacity, real alerts, backup retention and restore ownership.
- Historical resume privacy migration and legacy Calendar-token migration; request-based candidate export/deletion, retention policy, subprocessor agreements and final legal/privacy copy.
- Complete durable Calendar reconciliation; invoice/refund/dispute admin workflows; self-service member role changes/owner transfer; conflict handling for simultaneous profile editors.
- Audit history is append-only through application writes, not tamper-proof against database administrators. It is bounded to the latest 100 events in the UI and does not capture every read/auth/provider event. Retention must be defined, including events that intentionally survive entity deletion.
- Raw link URLs still exist in protected email-outbox HTML until cleanup. Restrict database access, protect backups and review the 30-day outbox cleanup policy. Token-table hashing alone does not remove all bearer material from the system.
- Growth work: queue throughput/load testing, full observability, bulk import, hiring-manager/client portals, advanced reporting and enterprise identity controls. Scope these against real pilot needs.

## Verification scope

All migrations were replayed against an isolated local PostgreSQL 18 database. A backup was restored to a second local database and all 25 applied migrations were verified. Automated tests use synthetic records and mock SMTP/payment/Calendar boundaries; they do not certify live providers. Production Next.js builds and Chromium browser tests cover the edited routes. The release report records the final test totals.
