# Troubleshooting

| Symptom | Check and recovery |
|---|---|
| Git push rejected `fetch first` | Run `git status`, fetch remote, then integrate its changes without force-pushing; preserve your local work. For README-only divergence, review a merge/rebase and resolve both versions before pushing. Credentials must work on your computer. |
| `npm ci` lock mismatch | Review package/lock changes together. Regenerate lock deliberately with `npm install --package-lock-only`, then rerun `npm ci`; do not delete the lock to bypass review. |
| Prisma missing new model/column | Install locked dependencies, run `npx prisma generate`, confirm intended DB and migration status. Back up/preflight and deploy the pending migration before new code; do not reset live data. |
| Health 503 | Check required variable names/strong secret/public HTTPS origin and database availability/pool. Health response intentionally hides secrets. Inspect safe event codes and private provider status. |
| Signup works but no email arrives | Inspect pending/dead-letter EmailOutbox and sender/app password/SMTP security mode, spam and provider quota. Queue creation is not delivery. Recovery cron needs its bearer secret; daily Hobby fallback can be late. |
| OTP expired/locked | Request a new code after the request allowance; use the newest email. Five incorrect guesses lock the challenge. Upload now needs `email` and `otp`; update custom clients accordingly. |
| Upload rejected | Live OTP, open eligible job, correct MIME and PDF/DOCX bytes, nonempty file <=3 MiB. DOCX ZIP path/entity/expansion checks may reject unusual documents; export a clean DOCX/PDF. |
| Resume missing/temporarily unavailable | Verify matching storage/cloud and ResumeUpload public ID, Cloudinary credentials and authorized workspace. Legacy public documents need migration; deleting consumed storage mappings can break signed downloads. |
| AI stays pending | Check GEMINI key/model/quota, durable job status/lease/availability and authorized cron; refresh pipeline after processing. Missing text/allowance or three failures become failed jobs; fix cause and requeue deliberately. |
| AI result inaccurate | Review original resume and job. Scores are advisory. Record a synthetic reproduction and provider/model version; do not automate rejection. |
| Interview rejected as overlapping | Check same assigned interviewer/name, duration and timezone. Adjacent nonoverlapping slots are allowed; concurrent overlapping writes serialize. Hired/rejected applications cannot be rescheduled. |
| Calendar missing after successful schedule | Reservation is authoritative; Google event creation is best effort. Check OAuth scopes/consent, callback URL, encrypted refresh token/key and provider status; schedule success does not prove Calendar success. |
| Feedback link invalid | It expires in seven days, is single-use and may have been replaced by a new request. Recruiter and candidate experience ratings are separate. |
| Access disappeared after reset/removal/switch | Expected for revoked sessions/memberships. Sign in again; choose a workspace where current membership exists. Never repair access by trusting a browser-supplied organization ID. |
| Billing disabled or mismatch | Merchant not configured, owner access, missing price/secret, active/pending plan or wrong recurring amount/currency. Keep billing disabled until real payment tests pass. |
| Tests refuse database | Expected guard: URL hostname localhost/127.0.0.1 and exact `/hirekarlo_audit`. CI uses that DB; never weaken it to run mutating fixtures on customer data. |
| Browser signed-in cases skipped | Set `E2E_AUDIT_DB=true` with the local audit DB and completed production build (`E2E_PRODUCTION=true`). No fixture flag means intentional skips, not a coverage pass. |
| Connection timeouts | Use pooled remote URL, correct TLS/region and connection budget. Each serverless process can use five connections; more instances multiply this. Check query/lock contention before increasing caps. |

Before asking support, collect commit/deployment/migration IDs, safe event codes, aggregate queue counts and a synthetic reproduction. Send privately to **amanworkinfo@gmail.com**. Do not attach `.env`, raw exception dumps, real resumes, access tokens or billing secrets. Rollback and restore procedure: `deployment.md` and `database.md`.
