# Staging and launch runbook

Owner: Aman Samani — amanworkinfo@gmail.com. Use your provider dashboards or deployment secret store for credentials; do not send keys in chat.

## Local setup

Use Node 22.12 or newer. Run `npm ci`, copy `.env.example` to `.env`, and supply a dedicated development PostgreSQL connection plus a strong `AUTH_SECRET`. Configure `NEXT_PUBLIC_APP_URL` for the actual environment. Run `npm run db:deploy`, then `npm run dev`. Optional provider features need their corresponding environment variables. Checkout stays disabled without Stripe configuration.

Use separate development, staging and production databases, storage folders, OAuth clients and payment environments. Integration fixtures require a database URL containing `hirekarlo_audit`; they delete test fixtures and must never use the customer database.

## Database release

1. Inspect production migration history before applying anything. The supplied project's older migrations must not be rewritten or blindly replayed against populated tables.
2. Back up PostgreSQL and rehearse restore. Test the whole release on a scrubbed populated copy, not only an empty database.
3. Resolve case-only email collisions explicitly. The normalization migration deliberately fails instead of silently merging identities.
4. Run `npm run db:deploy` as an explicit controlled release step. Preview builds only generate Prisma and build Next; they do not run migrations.
5. Verify indexes, subscriptions, trial dates, outbox jobs and historical application resume snapshots. Original overwritten resumes cannot be recovered by the migration.
6. Expect existing sessions to require a fresh login. Check a real owner, recruiter and restricted interviewer in each workspace.

Database/schema additions should remain during an application rollback unless their compatibility has been checked. Restore from a tested backup for data failures; do not reset the production database or use destructive migration commands as a shortcut.

## Hosting decision

You currently use Vercel Hobby. It permits personal, non-commercial projects; its daily cron schedule is insufficient for prompt production email retries and reminders. Default `vercel.json` retains daily jobs for noncommercial preview. After choosing a commercial plan, use `vercel.production.json` as the reviewed template: five-minute outbox, fifteen-minute reminders and hourly cleanup. This file does not activate Pro or create charges. [Hobby policy](https://vercel.com/docs/plans/hobby), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Configure `CRON_SECRET` and verify unauthorized cron requests fail. Test all schedules on the actual host. Database-backed request limits require a trusted proxy: confirm it overwrites forwarded client-IP headers. Use a managed PostgreSQL pool suitable for serverless connections, verified TLS, backups and connection limits. Keep secrets out of public `NEXT_PUBLIC_*` variables.

## External service validation

- Email: test registration, verification resend, reset, OTP, invitations, interview messages, reminders, retry and dead-letter behavior. Configure domain authentication where supported. Gmail is not proven to support your production sending volume. Verify queued versus delivered semantics and monitor failed messages; delivery can be duplicated after a crash.
- Cloudinary: test authenticated PDF/DOCX uploads and authorized downloads, rejected file types, byte limits, expired signatures, cleanup and organization isolation. Move all historical public assets to protected storage. Add malware scanning and isolated parsing before unrestricted public volume. New uploads use 3 MB to stay below Vercel's 4.5 MB request limit. [Vercel payload limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions), [Cloudinary access controls](https://cloudinary.com/documentation/control_access_to_media).
- AI: verify actual token bills, provider errors/timeouts, invalid output, multilingual resumes, hostile document instructions and human-review quality. Use appropriate paid/private-data provider processing. Replace synchronous screening with a durable worker before meaningful traffic; do not claim AI quality from mocked tests.
- Google: test OAuth scopes, reconnect/revocation, workspace switching, scheduled times and calendar failure handling. Production token encryption and operational credential rotation require verification.

## Payment activation

The included adapter is optional Stripe; Razorpay is not implemented. Confirm Indian merchant eligibility first. Configure six monthly price IDs matching exact plan amounts/currencies, test secret, webhook secret and portal settings. Never mix test and live environments.

In test mode verify checkout, abandoned/repeated checkout, portal, cancellation, renewal, failed payment, past-due access, duplicate/out-of-order webhook delivery, forged signatures and unknown price handling. Confirm invoices, tax collection requirements and refund process. Add monitoring and a reconciliation procedure for missed events; canonical webhook fetching does not replace periodic reconciliation. Only switch to live mode after these cases pass with the actual account. A checkout success redirect alone never grants a plan.

## Data and operational readiness

Choose explicit candidate retention periods and implement deletion/export across the database, files, emails and processors. Confirm controller/processor responsibilities, processing agreement, subprocessors and relevant transfer arrangements with appropriate counsel. The included terms/privacy pages are baseline product notices, not legal certification.

Add availability and error monitoring without logging resumes, OTPs, reset links, payment secrets or candidate details. Alert on outbox dead letters, webhook failures, unusual auth traffic, storage failures, database saturation and AI cost spikes. Set recovery objectives and rehearse an incident and restore. Verify cron cleanup and backup retention.

## Release checklist

Run lint, typecheck, unit and disposable-database integration tests, migration preflight, production build, browser tests and real-provider staging tests. Review mobile and keyboard use with actual authenticated recruiter flows. Current tests are focused coverage, not load or penetration testing.

Start with assisted pilots, monitor errors and cost daily, and collect paid renewal evidence. Enable public paid acquisition only after the audit's launch gates pass. The confirmed operating budget is under ₹3,000/month; see `BUDGET-PILOT.md`. The remaining owner decisions are an eligible payment provider account and confirmation of existing database/storage costs.
