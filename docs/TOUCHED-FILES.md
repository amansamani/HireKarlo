# Exact touched-file inventory

17 September 2026. Local project **D:\hiretrack**. Generated from the final Git diff against baseline commit **4fdcd6c**; the worktree was clean when this pass started.

**34 added, 51 replaced/changed, 1 removed: 86 project files.** Temporary build/browser output, local database dumps and backups are excluded. Existing real .env, Git history, old applied migration contents and license were preserved. No commit/push or live deployment was performed.

The owner can use these changes directly in the existing repository; this pass already applied them there. Pending migration: prisma/migrations/20260917000000_reliability_guards/migration.sql. Live migration still requires the backup/preflight/release sequence in deployment.md.

Original tracked contents are backed up at C:\Users\zakir hussain\OneDrive\Documents\New project\hirekarlo-review\cto-pass\baseline-before-this-pass; round-by-round backups are in sibling backup-* directories. New files can be identified by ADD below; do not restore by discarding unrelated future work.

| Action | File | Absolute location |
|---|---|---|
| REPLACE | `.env.example` | `D:\hiretrack\.env.example` |
| REPLACE | `.github/workflows/ci.yml` | `D:\hiretrack\.github\workflows\ci.yml` |
| REPLACE | `actions/analytics.ts` | `D:\hiretrack\actions\analytics.ts` |
| REPLACE | `actions/application.ts` | `D:\hiretrack\actions\application.ts` |
| REPLACE | `actions/auth.ts` | `D:\hiretrack\actions\auth.ts` |
| REPLACE | `actions/billing.ts` | `D:\hiretrack\actions\billing.ts` |
| REPLACE | `actions/candidates-pool.ts` | `D:\hiretrack\actions\candidates-pool.ts` |
| REPLACE | `actions/create-job.ts` | `D:\hiretrack\actions\create-job.ts` |
| REPLACE | `actions/interview.ts` | `D:\hiretrack\actions\interview.ts` |
| REPLACE | `actions/interviews-pool.ts` | `D:\hiretrack\actions\interviews-pool.ts` |
| REPLACE | `actions/jobs-pool.ts` | `D:\hiretrack\actions\jobs-pool.ts` |
| REPLACE | `actions/jobs.ts` | `D:\hiretrack\actions\jobs.ts` |
| REPLACE | `actions/public-apply.ts` | `D:\hiretrack\actions\public-apply.ts` |
| REPLACE | `actions/team.ts` | `D:\hiretrack\actions\team.ts` |
| REPLACE | `app/api/auth/google-calendar/callback/route.ts` | `D:\hiretrack\app\api\auth\google-calendar\callback\route.ts` |
| REPLACE | `app/api/auth/verify-email/route.ts` | `D:\hiretrack\app\api\auth\verify-email\route.ts` |
| REPLACE | `app/api/billing/webhook/route.ts` | `D:\hiretrack\app\api\billing\webhook\route.ts` |
| ADD | `app/api/cron/ai-scoring/route.ts` | `D:\hiretrack\app\api\cron\ai-scoring\route.ts` |
| REPLACE | `app/api/cron/interview-reminders/route.ts` | `D:\hiretrack\app\api\cron\interview-reminders\route.ts` |
| REPLACE | `app/api/cron/resume-cleanup/route.ts` | `D:\hiretrack\app\api\cron\resume-cleanup\route.ts` |
| ADD | `app/api/health/route.ts` | `D:\hiretrack\app\api\health\route.ts` |
| REPLACE | `app/api/upload/route.ts` | `D:\hiretrack\app\api\upload\route.ts` |
| REPLACE | `app/dashboard/error.tsx` | `D:\hiretrack\app\dashboard\error.tsx` |
| REPLACE | `app/dashboard/interviews/InterviewsPoolClient.tsx` | `D:\hiretrack\app\dashboard\interviews\InterviewsPoolClient.tsx` |
| REPLACE | `app/dashboard/jobs/[id]/JobPipelineClient.tsx` | `D:\hiretrack\app\dashboard\jobs\[id]\JobPipelineClient.tsx` |
| REPLACE | `app/dashboard/jobs/[id]/page.tsx` | `D:\hiretrack\app\dashboard\jobs\[id]\page.tsx` |
| REPLACE | `app/error.tsx` | `D:\hiretrack\app\error.tsx` |
| REPLACE | `app/global-error.tsx` | `D:\hiretrack\app\global-error.tsx` |
| REPLACE | `app/jobs/[id]/PublicApplyClient.tsx` | `D:\hiretrack\app\jobs\[id]\PublicApplyClient.tsx` |
| ADD | `CHANGELOG.md` | `D:\hiretrack\CHANGELOG.md` |
| REPLACE | `components/privacy/analytics-consent.tsx` | `D:\hiretrack\components\privacy\analytics-consent.tsx` |
| ADD | `compose.yaml` | `D:\hiretrack\compose.yaml` |
| ADD | `CONTRIBUTING.md` | `D:\hiretrack\CONTRIBUTING.md` |
| ADD | `docs/api.md` | `D:\hiretrack\docs\api.md` |
| REPLACE | `docs/architecture.md` | `D:\hiretrack\docs\architecture.md` |
| REPLACE | `docs/case-study.md` | `D:\hiretrack\docs\case-study.md` |
| ADD | `docs/database.md` | `D:\hiretrack\docs\database.md` |
| ADD | `docs/deployment.md` | `D:\hiretrack\docs\deployment.md` |
| ADD | `docs/FINAL-CTO-REVIEW.md` | `D:\hiretrack\docs\FINAL-CTO-REVIEW.md` |
| REPLACE | `docs/LAUNCH-RUNBOOK.md` | `D:\hiretrack\docs\LAUNCH-RUNBOOK.md` |
| ADD | `docs/MASTER-CHECKLIST.md` | `D:\hiretrack\docs\MASTER-CHECKLIST.md` |
| REPLACE | `docs/PRODUCTION-AUDIT.md` | `D:\hiretrack\docs\PRODUCTION-AUDIT.md` |
| ADD | `docs/PROJECT-MAP.md` | `D:\hiretrack\docs\PROJECT-MAP.md` |
| ADD | `docs/security.md` | `D:\hiretrack\docs\security.md` |
| ADD | `docs/testing.md` | `D:\hiretrack\docs\testing.md` |
| ADD | `docs/TOUCHED-FILES.md` | `D:\hiretrack\docs\TOUCHED-FILES.md` |
| ADD | `docs/troubleshooting.md` | `D:\hiretrack\docs\troubleshooting.md` |
| REPLACE | `docs/VERIFICATION.md` | `D:\hiretrack\docs\VERIFICATION.md` |
| ADD | `lib/ai-scoring-jobs.ts` | `D:\hiretrack\lib\ai-scoring-jobs.ts` |
| ADD | `lib/analytics-privacy.ts` | `D:\hiretrack\lib\analytics-privacy.ts` |
| REPLACE | `lib/application-otp.ts` | `D:\hiretrack\lib\application-otp.ts` |
| REPLACE | `lib/auth.ts` | `D:\hiretrack\lib\auth.ts` |
| ADD | `lib/credentials.ts` | `D:\hiretrack\lib\credentials.ts` |
| ADD | `lib/docx-validation.ts` | `D:\hiretrack\lib\docx-validation.ts` |
| REPLACE | `lib/google-calendar.ts` | `D:\hiretrack\lib\google-calendar.ts` |
| ADD | `lib/logger.ts` | `D:\hiretrack\lib\logger.ts` |
| REPLACE | `lib/parse-resume.ts` | `D:\hiretrack\lib\parse-resume.ts` |
| REPLACE | `lib/prisma.ts` | `D:\hiretrack\lib\prisma.ts` |
| ADD | `lib/readiness.ts` | `D:\hiretrack\lib\readiness.ts` |
| REPLACE | `lib/require-auth.ts` | `D:\hiretrack\lib\require-auth.ts` |
| REPLACE | `lib/score-resume.ts` | `D:\hiretrack\lib\score-resume.ts` |
| REPLACE | `lib/send-email.ts` | `D:\hiretrack\lib\send-email.ts` |
| REPLACE | `next.config.ts` | `D:\hiretrack\next.config.ts` |
| REPLACE | `package-lock.json` | `D:\hiretrack\package-lock.json` |
| REPLACE | `package.json` | `D:\hiretrack\package.json` |
| REPLACE | `playwright.config.ts` | `D:\hiretrack\playwright.config.ts` |
| ADD | `prisma/migrations/20260917000000_reliability_guards/migration.sql` | `D:\hiretrack\prisma\migrations\20260917000000_reliability_guards\migration.sql` |
| REPLACE | `prisma/schema.prisma` | `D:\hiretrack\prisma\schema.prisma` |
| REPLACE | `proxy.ts` | `D:\hiretrack\proxy.ts` |
| REPLACE | `README.md` | `D:\hiretrack\README.md` |
| ADD | `scripts/database-preflight.mjs` | `D:\hiretrack\scripts\database-preflight.mjs` |
| ADD | `scripts/seed-demo.mjs` | `D:\hiretrack\scripts\seed-demo.mjs` |
| ADD | `tests/e2e/audit-fixtures.ts` | `D:\hiretrack\tests\e2e\audit-fixtures.ts` |
| ADD | `tests/e2e/audit-teardown.ts` | `D:\hiretrack\tests\e2e\audit-teardown.ts` |
| ADD | `tests/e2e/workspace.spec.ts` | `D:\hiretrack\tests\e2e\workspace.spec.ts` |
| ADD | `tests/helpers/audit-db.ts` | `D:\hiretrack\tests\helpers\audit-db.ts` |
| ADD | `tests/integration/reliability.test.ts` | `D:\hiretrack\tests\integration\reliability.test.ts` |
| REPLACE | `tests/integration/saas.test.ts` | `D:\hiretrack\tests\integration\saas.test.ts` |
| REMOVE | `tests/next.config.ts` | `D:\hiretrack\tests\next.config.ts` |
| ADD | `tests/unit/ai-provider.test.ts` | `D:\hiretrack\tests\unit\ai-provider.test.ts` |
| ADD | `tests/unit/analytics-privacy.test.ts` | `D:\hiretrack\tests\unit\analytics-privacy.test.ts` |
| ADD | `tests/unit/health.test.ts` | `D:\hiretrack\tests\unit\health.test.ts` |
| ADD | `tests/unit/navigation-auth.test.ts` | `D:\hiretrack\tests\unit\navigation-auth.test.ts` |
| ADD | `tests/unit/reliability.test.ts` | `D:\hiretrack\tests\unit\reliability.test.ts` |
| REPLACE | `vercel.json` | `D:\hiretrack\vercel.json` |
| REPLACE | `vercel.production.json` | `D:\hiretrack\vercel.production.json` |
