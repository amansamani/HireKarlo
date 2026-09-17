# Changelog

## Unreleased — 17 September 2026

- Added project map/master checklist and full API/database/deployment/security/testing/troubleshooting handoff.
- Persisted asynchronous AI review with owned leases, bounded retries/dead letters and authorized recovery cron; applicant submission commits before provider work.
- Coupled signup/verification/reset/invites, pipeline/interview/reminder notification intents to business transactions; fenced email acknowledgements and retries by UUID lease.
- Serialized overlapping interview reservations; preserved fresh terminal/round stages on cancellation and blocked terminal rescheduling; Calendar remains best effort.
- Made verification and experience links single-use; separated candidate experience from reviewer ratings; bounded new password UTF-8 bytes to bcrypt's 72-byte boundary.
- Enabled assigned interviewers to list only their own workspace interviews and save scorecards; hid hiring controls and private ratings from that role. Connected the candidate-experience UI to its separate field and verified distinct values in the browser.
- Required a live applicant OTP before Cloudinary upload; wrong guesses share a persistent cap while successful checks preserve the allowance. Added archive expansion/path/XML/header consistency checks.
- Restricted creator/owner deletion to preserve shared recruiting/audit records; added SQL role/duration/rating/score checks and pending migration `20260917000000_reliability_guards`.
- Added core readiness endpoint, bounded PostgreSQL connections/timeouts, safe application logging, marketing-only sanitized analytics and private-route indexing headers.
- Bounded applicant responses with visible pagination; removed an unused unbounded interview action and unused `googleapis` runtime dependency; moved the shadcn CLI to development dependencies and aligned Prisma 7.10 versions/lock.
- Expanded meaningful unit/database/authenticated-browser regressions, guarded test/seed destinations and updated CI. Added repeatable local synthetic seed, read-only database preflight and optional loopback Compose template.
- Preserved owner author/contribution policy, actual `.env`, existing Git history, applied migrations and free-preview scheduling. No live database migration, deployment, purchase or payment activation performed.

## Reviewed foundation — 16 September 2026

Organization-scoped SaaS roles/limits/trial, private new resume storage and privacy snapshots, optional signed billing, agency clients/workspace switching, email retry queue and isolated CI/test foundation. Prior dated audit/research documents are historical evidence; current status is `docs/FINAL-CTO-REVIEW.md`.
