# Current architecture

Reviewed 16 September 2026. Historical case-study material describes an earlier prototype and should not be used as the current security or deployment specification.

## Application

Next.js 16 App Router and React 19, server actions and route handlers, PostgreSQL through Prisma 7 and the pg adapter. Authentication uses Auth.js credentials and JWTs. Server-side `requireAuth` verifies the user's session version and active organization membership. Proxy routing is an initial navigation check, not the authorization boundary.

## Tenant model

Users belong to organizations through memberships. OWNER and ADMIN manage teams; RECRUITER works on hiring pipelines; INTERVIEWER has restricted assigned-interview access. Organization IDs come from authenticated context rather than client form authority. A membership-checked cookie selects the workspace.

Organizations own jobs, candidate pools, agency client records, subscriptions and usage counters. Applications join organization candidates to jobs and retain their own resume snapshot, privacy acknowledgement and notice version. Interviews and activity records belong to applications. Shared candidate records do not imply cross-organization identity or access.

## Candidate intake and documents

Public applicants authenticate their email using a shared database HMAC challenge. Atomic attempt counters protect verification, submission and status access. Application writes atomically claim the challenge and upload, enforce candidate limits and create the application. Newly uploaded PDF/DOCX resumes use authenticated Cloudinary raw storage. Authorized route handlers issue short-lived downloads; historical public URLs still require migration.

Parsing and Gemini scoring currently run synchronously during intake. A PostgreSQL credit counter bounds attempted AI work; a durable scoring worker remains required for stronger reliability and throughput. Provider results support human judgment.

## Plans and billing

`lib/plans.ts` defines capacities and monthly INR/USD prices. A fourteen-day trial uses Growth capacity with 100 total AI attempts. Entitlement transactions lock the organization row before job, seat, candidate and credit checks. Interviewer seats are exempt; pending recruiter invitations reserve seats.

Optional Stripe checkout verifies server-configured recurring prices and reuses pending sessions. Signed webhook processing is idempotent, locks organization updates, and retrieves canonical provider state before updating subscriptions. Expired or past-due subscriptions cannot obtain active entitlements. Payment redirects do not grant access. Merchant approval, real payment validation and reconciliation are still release gates.

## Email and schedules

Email content is escaped and persisted to an outbox before delivery. Workers lease records, retry failures and retain dead letters. Delivery is at least once, and every business write is not yet atomically coupled to its outbox record. Cron routes require `CRON_SECRET`; cleanup removes expired challenges, request counters and old outbox records. Daily preview scheduling differs from the frequent commercial-hosting template.

## Deployment and checks

Environment-specific databases and credentials are required. Prisma generation runs during build; migrations are an explicit release step. CI uses disposable PostgreSQL rather than live customer secrets. Unit, database integration and Chromium browser checks cover selected critical behavior, not all production risks. See the production audit and runbook for unresolved parsing, calendar concurrency, monitoring and legal/data-handling requirements.
