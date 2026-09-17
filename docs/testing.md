# QA strategy and execution plan

Use synthetic data and an isolated local `hirekarlo_audit` database only. The integration suite and browser fixture setup check host **and** exact database name before mutations. Provider calls are mocked in database tests; browser server credentials for SMTP/AI/Stripe are empty. Test results cover named scenarios, not complete security/product coverage.

## Commands

```sh
npm ci
npm run db:deploy
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
```

For the commands above, set `DATABASE_URL` privately to your local audit database. Configure a synthetic 32+ character `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. For signed-in browser coverage also set `E2E_AUDIT_DB=true`, `E2E_PRODUCTION=true` (uses the completed build). `E2E_PRODUCTION` false uses development mode. The fixture setup creates unique verified owner/interviewer accounts and private tenant records, shares random test credentials only with test workers, and tears down those fixture records. Never reuse a live web server for isolated browser fixtures.

Optional local PostgreSQL is described in `database.md`. `docker compose` is a convenience template; this pass used an installed local PostgreSQL server. Chromium was exercised; Safari/Firefox were not. HTML reports, traces and screenshots are ignored in Git (`playwright-report`, `test-results`, `audit-artifacts`). They can contain synthetic credentials/DOM text; keep reports private.

## Formal test matrix

| Area | Automated evidence | Remaining manual/external work |
|---|---|---|
| Signup/login | Duplicate/pilot denial, strong-password boundary including UTF-8, persisted user/workspace/token/email intent, verified/correct-password checks; signed-in browser session | Real SMTP verification link delivery and account lifecycle on deployed build |
| Reset/token expiry | Parallel reset single-use/session version, parallel verify single-use, expired verification rejection | Real browser old-session invalidation across devices, expired reset email, live logout/relogin |
| Logout/protection | Browser sign-out then protected navigation; protected routes; denied workspace pipeline/resume access | Independent CSRF/IDOR tests with multiple staging accounts |
| Applicant intake | Shared OTP lockout/single consumption, atomic upload claim/privacy snapshot/application, valid email requirement before storage | Real PDF/DOCX upload + email + private download + duplicate/status journey on staging |
| Hiring/team/plans | Tenant mutation denial, unknown role, job/AI/invite quota concurrency, client browser save and pipeline rendering | Full owner/admin/recruiter/interviewer matrix and workspace switching across browsers |
| Interviews | Parallel overlap denial, timezone/job/role validation, cancellation terminal-stage preservation, no terminal rescheduling, single-use integer candidate rating; browser own-assignment list/scorecard persistence and candidate-experience display using distinct reviewer values | Live OAuth/event create/delete/expired token and exact-time delivery expectations |
| Worker failure | AI parallel claim/quota/completion, retry/backoff/dead-letter; SMTP parallel lease/stale acknowledgement and eight-attempt dead letter; transaction rollback | Function termination, real provider acceptance/crash duplication and leased-job recovery across instances |
| Validation/malicious data | Expanded DOCX limits/path/XML, malformed files, AI output schema, CSV formula/quotes, encryption tamper/wrong key, safe logs/analytics URL filtering | PDF parser resource sandbox/malware scans, fuzzing, distributed upload abuse |
| Infrastructure | Missing environment/database health 503, core 200/no-store/security headers, unauthenticated cron rejection, migration replay/no drift and local restore | Provider outage drills, live backup RPO/RTO, real alert delivery and incident procedures |
| Frontend | Public pages, invalid login validation, desktop signed-in navigation/refresh, mobile/tablet pricing width checks | Keyboard/screen-reader/contrast assessment across dialogs; Safari/Firefox; throttled network and all loading/error/empty states |
| Billing | Bad signature denial, duplicate signed webhook processing and canonical state rather than stale event state | Real sandbox/live checkout, failed/renewed/cancelled payment, tax/invoice, refund and reconciliation |

No percentage coverage claim is made: line/branch coverage was not collected. CI on PostgreSQL 18/Node 22 runs lint, types, unit, migrations, DB integration, build and Chromium; the actual remote run remains unverified until a reviewed push.

## Production smoke procedure (after release)

1. Verify deployment/commit and migration identifiers; health 200 and HTTPS/security headers. Confirm public pages, 404 behavior and mobile navigation.
2. Register a permitted synthetic business email; verify received email; log in/reload; log out; deny dashboard access without session. Reset password and confirm prior sessions fail. Test duplicate account/expired links.
3. Create workspace client/job, share application link; apply with a second synthetic email, real private PDF/DOCX and acknowledged privacy notice. Check duplicate prevention, status, application snapshot and asynchronous AI. Force one provider error safely and confirm durable recovery.
4. Move stage; inspect audit and actual email delivery. Schedule/conflict/cancel an interview; check UTC/local rendering, calendar event and feedback-link expiry/single use. Check notifications do not claim delivery before provider acceptance.
5. Invite recruiter/interviewer; verify email identity, role denial, removal/session denial and tenant isolation with another organization. Check authorized resume link expiry and direct asset privacy.
6. If billing is enabled, run approved merchant sandbox cases first and separately verify live payment/reconciliation; confirm signed provider state grants access and past-due plans deny paid entitlements. Never substitute mocked tests for this evidence.
7. Inspect queue age/dead letters, host/provider errors and cost; verify backup/restore and alerts. Record passed/failed/skipped cases with deployment date and synthetic record IDs privately; clean up test data and provider documents.

This pass's public HTTPS 200 check is only a read-only smoke of the **previous live deployment**. It does not count as release or authenticated production verification of the local changes. Actual results are in `FINAL-CTO-REVIEW.md`.
