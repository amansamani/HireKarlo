# HireKarlo

HireKarlo is a business recruitment workspace for agencies and company hiring teams. It connects jobs, public applications, candidate pipelines, interviews, team access and advisory AI resume review. Candidates can apply without buying a plan or creating a business account.

Created and maintained by **Aman Samani** · [Author](https://amansamani.me) · **amanworkinfo@gmail.com**. Repository: [HireTrack](https://github.com/amansamani/HireTrack). Existing personal preview: [hirekarlo.amansamani.me](https://hirekarlo.amansamani.me). Originally built for the Digital Heroes Full Stack Developer Trial.

**Status:** reviewed SaaS foundation with targeted local verification. These local changes have not been deployed or migrated to the live database. Actual evidence and release gates: [Final CTO review](docs/FINAL-CTO-REVIEW.md) and [master checklist](docs/MASTER-CHECKLIST.md). No production certification, commercial hosting purchase or payment activation is claimed.

## Product

- Organization memberships, role restrictions, workspace switching and fourteen-day trial/capacity limits.
- Jobs and custom rounds, public OTP application/upload/status, application resume snapshot and privacy acknowledgement.
- Candidate pool/search/CSV, bounded applicant pages, stage history and notifications.
- Serialized interview bookings, optional Google Calendar/Meet, reviewer feedback and single-use candidate experience ratings.
- Agency client contacts/job assignments and durable email/AI recovery queues.
- Owner-only Razorpay INR subscription billing, verified payment history, cancellation and recovery; Stripe remains optional. Signed webhooks use canonical provider state. Merchant setup and actual payments remain unverified. See [Razorpay setup](docs/razorpay-setup.md).

The problem is scattered hiring records and manual screening work. The first customer is a business hiring team, not a student/job seeker. Current monthly pricing hypotheses are Starter ₹1,499/$29, Growth ₹3,999/$79 and Agency ₹7,999/$149. Razorpay supports the INR prices. These are proposed prices, not measured willingness to pay. [Prior market/pricing research](docs/MARKET-AND-PRICING.md) needs validation through paid pilots/renewals before launch. No placement CRM, client portal, job-board syndication or annual billing is implemented.

AI supports human judgment and can be inaccurate or manipulated. It never automatically hires/rejects candidates. Review original documents and documented job criteria before employment decisions.

## Stack and architecture

Next.js 16 / React 19 / TypeScript; Auth.js credentials/JWTs; PostgreSQL / Prisma 7.10 / pg adapter; Zod / React Hook Form; SMTP / Cloudinary / optional Gemini, Google and Stripe. Frontend, route handlers and server actions run together in the Next.js service. PostgreSQL owns tenant data, limits and durable work. [Architecture and data flows](docs/architecture.md) explain transactions, providers and tradeoffs.

```text
app/                  App Router pages, HTTP handlers, errors and metadata
actions/              Validated recruiting/account/workspace commands
components/           Forms, dashboard, UI and privacy controls
lib/                  Auth/context, plans, providers, queues and security helpers
prisma/               Schema and 24 append-only migrations
scripts/              Read-only database preflight and guarded local demo seed
tests/                Unit, isolated database integration and Chromium journeys
docs/                 Audit, reference, operations and handoff evidence
.github/workflows/    CI using disposable PostgreSQL
compose.yaml          Optional loopback-only local audit PostgreSQL
```

## Local setup

Prerequisites: Node **22.12+**, npm, PostgreSQL and Git. This pass ran Node 24.13/PostgreSQL 18; CI specifies Node 22. Docker is optional; the Compose template was not executed in this review.

```sh
git clone https://github.com/amansamani/HireTrack.git
cd HireTrack
npm ci
```

Use the reviewed commit once it is pushed. Copy `.env.example` to `.env` privately (`Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` in a POSIX shell). Configure the three core values: a dedicated database, an unpredictable 32+ character `AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Full variable requirements: [deployment guide](docs/deployment.md).

For optional local PostgreSQL run `docker compose up -d postgres` and use `postgresql://hirekarlo_audit:local_audit_only@localhost:5433/hirekarlo_audit`. Alternatively configure an installed local PostgreSQL with that exact database name. Never point test/seed commands at customer data.

```sh
npm run db:deploy
npm run db:preflight
# Optionally set a strong SEED_DEMO_PASSWORD privately, then:
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seed creates synthetic business records and a verified `demo-owner@example.test` using the configured seed password; it is repeatable and refuses a nonlocal/non-audit database. Ordinary signup/applicant verification needs SMTP. Actual document intake needs Cloudinary; AI and Calendar are optional. Frontend/backend start together; there is no second backend command.

For production-mode local execution: `npm run build`, then `npm start`. Builds generate Prisma but do not run database migrations. [Database guide](docs/database.md) explains models, indexes, constraints, preflight and recovery.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
```

Use local `hirekarlo_audit` for integration tests. Enable `E2E_AUDIT_DB=true` for authenticated fixtures and `E2E_PRODUCTION=true` for a completed build, with a synthetic secret/local URL. Browser provider credentials are cleared; no real billing/email actions are verified by mocks. [Formal QA matrix](docs/testing.md) and [final result evidence](docs/FINAL-CTO-REVIEW.md) distinguish passes, skips and external checks. Screenshots/reports are generated in ignored `audit-artifacts`/`playwright-report` directories, not committed production marketing assets.

## API, security and release

[API reference](docs/api.md) covers route methods, inputs, auth, examples and error codes. Server actions are first-party contracts, not a public REST API. Public `/api/health` reports core config/database readiness only.

[Security guide](docs/security.md) describes membership scope, session revocation, OTP/tokens, byte-bounded passwords, private new documents, safe logs/analytics and remaining risks. Legacy public resumes/plaintext tokens, PDF parser isolation/malware scanning, strict CSP, independent access testing and real provider privacy/retention checks remain work. Never commit `.env`, tokens or real resumes.

Follow [deployment/rollback](docs/deployment.md): backup/preflight, apply pending **`20260917000000_reliability_guards`** before new code, configure host scopes, deploy and run authenticated/provider smoke. Pushing to GitHub alone does not ensure a working migration or deployment. Keep default daily `vercel.json` for the current personal/noncommercial Hobby preview; `vercel.production.json` is an inactive commercial-host template. No upgrade is required to inspect this work locally.

[Troubleshooting](docs/troubleshooting.md) covers Git divergence, migration/env/pool errors, missing email, upload/AI/Calendar problems and safe support information. [Maintainer workflow](CONTRIBUTING.md) and [changelog](CHANGELOG.md) describe review and maintenance.

## Known limitations and roadmap

Before customer launch: legacy document/token migration, real SMTP/Cloudinary/Google/Gemini checks, backup/restore and monitoring, commercial hosting/scheduling, merchant/payment lifecycle and professional privacy/data-processing review. Before scale: load/export/parser resource benchmarks and isolation; fuller accessibility/multi-browser QA. Later product work: agency placement/client portal, integrations, SSO/MFA and annual billing when customer evidence supports them. Details and priority/verification state live in the master checklist, rather than treating all present code as finished.

This is a personal product maintained by its creator; unsolicited pull requests/external contributions are not currently accepted. Authorized collaborators should use the maintainer process. The existing [MIT license](license) remains unchanged; contribution acceptance is a separate maintenance policy.
