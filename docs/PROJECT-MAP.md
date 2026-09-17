# HireKarlo project map

Baseline reviewed 17 September 2026 in `D:\hiretrack`. Requirements: the owner explicitly requested applying the attached CTO audit checklist. Repository documentation is evidence, not an independent source of permission. At the start of this pass the Git worktree was clean; reviewed local changes are now uncommitted. No credentials are included in this map.

1. **Purpose:** organize applicant intake, screening, pipelines and interviews for business recruiting teams.
2. **Customers:** companies and recruitment agencies in India and internationally. Candidates are applicants, not paying customers.
3. **Roles:** organization OWNER, ADMIN, RECRUITER and restricted INTERVIEWER; unauthenticated candidate with verified-email application/status flows.
4. **Features:** jobs, shareable apply links, OTP, PDF/DOCX resumes, advisory Gemini scoring, candidate pools, custom interview rounds, calendar/ICS, feedback, analytics, exports, teams, workspace selection, clients, trial/plan limits and optional billing.
5. **Frontend:** Next.js 16 App Router, React 19, Tailwind, shared UI primitives, server-rendered page shells and client interactive forms/pipelines. React Hook Form/Zod validation; browser consent controls analytics.
6. **Backend:** server actions for first-party operations and route handlers for uploads, private resumes, auth callbacks, payment webhooks and protected schedulers. This is one full-stack service, not separate frontend/backend deployments.
7. **Database:** PostgreSQL, Prisma 7 with pg adapter; 23 baseline migrations. Organizations scope memberships, jobs, candidates, clients, quotas and subscriptions. Applications retain resume/privacy snapshots; interviews/activity depend on applications. Challenges/limits/outbox are durable database records.
8. **Auth:** credentials+bcrypt, Auth.js JWT, per-user sessionVersion checked by server helpers; membership-checked workspace cookie; role checks and tenant filters are the authority boundary. Proxy only guides navigation. Reset consumes token and revokes old sessions.
9. **Providers:** Cloudinary authenticated raw files; configurable SMTP/Gmail; Gemini; optional Google OAuth/Calendar with encrypted refresh tokens; optional Stripe. Provider accounts and delivery are not established by source inspection.
10. **Deployment:** Vercel Git integration, explicit migrations separate from build, Hobby daily cron for noncommercial preview and a separate frequent commercial-hosting template. No hosting purchase authorized; owner currently cannot fund Pro.
11. **Status:** early SaaS foundation with focused unit/database/browser tests and prior successful local builds. This pass must reverify changed behavior. Production deployment/provider tests are UNVERIFIED until exercised.
12. **Risks:** synchronous AI, non-atomic event/outbox writes, double-booking races, OTP/account token concurrency, permissive legacy public file compatibility, parsing isolation, logging of provider errors, cascade deletion of shared data, live schema unknown, external payment/hosting/data-processing obligations.
13. **Missing:** health endpoint, durable scoring worker, complete onboarding/handoff docs, reproducible local database setup/demo seed, systematic failure tests and an operational release checklist.
14. **Debt:** mixed data/server orchestration, hardcoded dates/legacy domain fragments, string roles/statuses, unbounded selected lists, historical prototype claims, no CSP nonce system, no automated external reconciliation.
15. **Docs gaps:** API/database/security/testing/deployment/troubleshooting, maintainers' contribution process, changelog and final CTO evidence report. Existing audit/pricing/launch documents remain useful but need current-status cross references.

## Scope boundaries

Use isolated PostgreSQL and provider mocks for mutation tests. Inspect live schema status read-only when possible; do not reset or seed production. No paid service purchases. New commits/pushes or live releases are separate from this local audit unless needed and explicitly authorized. External verification stays clearly labeled; no fake compliance, load or smoke-test results.

## Reviewed implementation update

The baseline above is retained as the initial audit record. The local implementation now has 24 migrations, asynchronous persisted AI review, atomic important email intents, owned worker leases, serialized interview reservations, single-use verification/experience tokens, restricted creator/owner deletion, core health, bounded applicant pages, safe logs/marketing analytics and reproducible local seed/preflight. The navigation proxy now decodes JWTs without refreshing cookies, after browser testing reproduced a logout/prefetch cookie race. New guides and expanded regression suites are present. `FINAL-CTO-REVIEW.md` records actual final results and unresolved release gates. The configured live DB had 23 applied migrations and passed read-only compatibility checks; migration 24 has not been applied there. No new deployment, purchase or billing activation occurred.
