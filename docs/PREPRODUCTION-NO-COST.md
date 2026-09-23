# HireKarlo: no-spend preproduction checklist

**Reviewed 23 September 2026.** This is a preparation plan for a private, synthetic-data preview. Do not invite real candidates, accept real payments, or describe the current deployment as production-ready. The original checklist mixed already completed work, paid launch work, and scale work.

## Completed in this review

- [x] Fixed the Prisma CLI mismatch: CLI and Client are both `7.10.0`. `prisma generate`, migration commands, and builds now run.
- [x] Replayed all 28 migrations on an isolated local database. The configured remote database also reports all 28 applied; preflight checks are zero and schema diff reports no difference. **No remote migration was applied.**
- [x] Passed lint, production build, 66 unit tests, 74 database integration tests, and 26 Chromium browser tests. The older checklist's “77/77” figure is obsolete.
- [x] Verified SMTP authentication, the three Razorpay **test-mode** plan prices, and a synthetic Cloudinary authenticated upload/download. An unsigned authenticated URL returned 401; a short-lived signed download returned 200. The synthetic asset was deleted.
- [x] Changed new resume uploads to store an unsigned authenticated reference. Added download support for migrated historical assets that predate `ResumeUpload`. These code changes are **local and not deployed**.
- [x] Changed production registration to fail closed when `PILOT_SIGNUP_EMAILS` is empty. This safeguard is also **local and not deployed**; approved pilot addresses still need to be configured on the actual host.
- [x] Inventoried legacy data without displaying candidate details: four distinct public Cloudinary resume assets are reachable without authentication. They appear in four candidate records and one application snapshot. No unexpired plaintext bearer tokens or plaintext Google refresh tokens were found in the configured remote database.
- [x] Checked the deployed endpoints: `/api/health` returns 200, but `/api/ops/health` returns 503 with one failed AI job and one billing backlog item. The configured remote database did not show the same AI failure, so the deployed database/environment needs to be identified before clearing anything.
- [x] Confirmed the deployed Razorpay webhook rejects a bad signature (400) and the protected cron/operations routes reject requests without their secret (401). A valid live webhook delivery has not been exercised.

## Remaining free work before even a limited real-data pilot

1. [ ] **Confirm the deployed environment.** Compare the Vercel database target and environment scope with the intended database without sharing credentials. Identify the failed AI job and stale billing item using safe status/error codes; resolve them without triggering paid AI calls or real payments. Recheck private operations health.
2. [ ] **Restrict access.** Set `PILOT_SIGNUP_EMAILS` in the actual deployment to approved test-account addresses. The current deployed code may allow public registration when the value is empty; the reviewed local change blocks it after deployment. Keep synthetic records only until privacy, backup and provider checks pass. A signup allowlist does not by itself make a business deployment eligible for Vercel Hobby.
3. [ ] **Verify recovery.** Confirm the actual database provider's backup retention and restore access. Take an encrypted backup and restore it into an isolated destination before changing historical candidate assets. Record who can restore it. The live-data restore rehearsal was stopped by automatic approval review because it would copy sensitive candidate/organization data into an unencrypted local dump; this needs explicit approval of the destination and protection method.
4. [ ] **Deploy the reviewed code change, then privatize the four legacy assets.** For each asset, change Cloudinary delivery from `upload` to `authenticated` with CDN invalidation, update every database reference to its **unsigned** authenticated URL, and verify authorized signed downloads work while old direct URLs fail. Keep a reversible per-asset record during the operation. Do this after the backup/restore gate because the current live code cannot download migrated assets without the local compatibility fix.
5. [ ] **Run a synthetic account journey on the deployed build.** Verification and reset email; sign-in/session revocation; job/application with a synthetic PDF or DOCX; private resume download; interview decision; team invite/removal and cross-workspace denial. Use test addresses only. SMTP authentication passed, but actual delivery and SPF/DKIM/DMARC have not been proven.
6. [ ] **Verify optional integrations only if you intend to enable them.** Google Calendar callback/schedule/cancel and Gemini parsing/failure recovery need real-host checks. Disable an optional integration if its quota, cost, or data-handling terms are unsuitable. Razorpay remains in Test Mode; test checkout/webhook behavior can be checked without taking money.
7. [ ] **Do a short accessibility pass** on signup, application, hiring, and billing screens: keyboard navigation, focus, labels, and contrast. Record concrete defects rather than making an unverified accessibility claim.

## Deferred until money and a commercial launch decision

- Vercel Pro or another host that permits this commercial use, frequent recovery schedules, paid alerting, merchant activation, live Razorpay credentials/transaction/refund, tax/invoicing review, and a formal production on-call/SLA plan.
- Independent security and legal/privacy reviews are valuable before broad real-candidate use, but they are not required to run a synthetic private preview.
- Load tests, advanced CSP, malware scanning, SSO/MFA, client portal, annual billing, and full cross-browser coverage are later scope. Do not treat them as blockers for a synthetic preview.

**Hosting note:** Vercel states that Hobby is for personal, non-commercial use, and Hobby cron schedules run at most once daily with imprecise timing. Restricted signup or no payment does not automatically make a business pilot non-commercial. See [Vercel Hobby](https://vercel.com/docs/plans/hobby) and [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
