> Historical foundation-pass document. Some findings were fixed in the 17 September local CTO pass. Use [Final CTO review](FINAL-CTO-REVIEW.md), [current checklist](MASTER-CHECKLIST.md) and [deployment guide](deployment.md) for current implementation and pending release gates. Older test counts are not final-pass results.

# HireKarlo production audit

Reviewed 16 September 2026 for Aman Samani. This is a local engineering review and upgrade of the supplied ZIP, not a deployment, penetration test, or compliance certification. The original ZIP is unchanged. Attached documentation was treated as project evidence; its contribution restrictions did not override your request. MIT author attribution remains.

## Decision

The original project was a useful recruiting prototype, but unsuitable for taking production SaaS payments. The reviewed version adds a B2B SaaS foundation. Release it first to a controlled staging pilot after the launch gates below pass. Do not advertise enterprise security, complete agency CRM, guaranteed hiring outcomes, or contractual uptime.

## Coverage and evidence

Source inventory traverses project files, records hashes, parses JavaScript/TypeScript, checks local imports, and reports possible credential locations without exposing values. Temporary `.tmp.driveupload` files were read as data and excluded from the delivery archive. Dependencies and build output are not counted as authored source. Manual review focused on authentication, tenant isolation, application submission, authorization, uploads, interviews, billing, email, migrations, and deployment. Automated coverage does not establish that every line is correct.

Final check results are in `VERIFICATION.md`. Integration tests use a disposable local PostgreSQL database and mocked external services. There was no access to your live Vercel deployment, customer database, SMTP, Gemini, Cloudinary, Google account, or payment account.

## Findings and local changes

| Area | Original risk | Reviewed implementation | Remaining work |
|---|---|---|---|
| Authentication | Password reset consumption and stale JWT revocation were weak | Atomic reset, session version checks, canonical emails, resend verification, shared request limits | Real mail delivery, auth abuse monitoring, MFA for privileged accounts |
| Tenant isolation | Broad interviewer access and inconsistent role checks | Fail-closed role checks; organization-scoped actions, exports, private resume routes; membership-checked workspace switch | Expand negative authorization tests to every new endpoint |
| Public applications | In-process OTP counters; alternate endpoints bypassed attempt limits | PostgreSQL-backed limits and HMAC challenges; five guesses; transactional OTP/upload claim and application creation | Load testing, proxy header trust configuration, scheduled cleanup |
| Candidate records | Reapplications could overwrite the document shown for historical applications | Per-application resume snapshot and privacy acknowledgement evidence | Historical overwritten documents cannot be reconstructed |
| Resumes | Public raw CDN documents and oversized serverless payloads | Authenticated Cloudinary uploads; scoped short-lived download routes; PDF/DOCX signatures, 3 MB cap, parser timeout and byte cap | Migrate existing public documents; malware scanning; isolated parsing and archive expansion limits |
| SaaS economics | No subscription, quota, seat or trial controls | Fourteen-day trial, three plans, transaction-locked job/seat/candidate limits and AI counters | Validate real demand and cost; no automatic overage or annual billing |
| Billing | No payment integration | Optional owner-only Stripe checkout/portal; server-selected verified prices; signed, idempotent webhook handling and canonical provider state | Merchant approval, real test-mode end-to-end checks, reconciliation, tax/refund/dunning operations; Razorpay is not implemented |
| Agency workflow | No client records | Organization-scoped agency clients and job assignment | Submissions, placement tracking, commissions, client portals and placement invoicing |
| Email | Fire-and-forget delivery and unescaped user content | Durable outbox, leased retries, dead-letter records, template escaping, reminder deduplication | Business changes and outbox writes are not universally one transaction; duplicate delivery after a crash is possible; alerting and SMTP validation |
| AI | Unbounded cost and synchronous external work | Measured credits, provider timeout, input/output limits, advisory wording | Durable scoring worker, actual quality/bias assessment, prompt-injection evaluation, multilingual calibration; failed attempts can consume credits |
| Interviews | Permissions and spoofable assignment checks | Member/assignment checks, runtime schemas, timezone validation, eight-hour overlap scan and OAuth state bound to user/workspace | Concurrent scheduling requires stronger database constraints; verify real Google calendar flows |
| Browser and exports | CSV formulas, consent storage errors, misleading security claims | Formula-safe exports, resilient analytics consent, baseline headers, corrected claims and public policy routes | CSP with tested nonce support, broader accessibility and authenticated browser tests |
| Database release | Preview builds could migrate the production database | Explicit migration deployment; indexes and additive SaaS migrations | Backup/restore rehearsal and populated production migration preflight; canonical-email migration intentionally stops on collisions |
| Operations | Free personal hosting, no service monitoring | Separate preview and production scheduler configurations; isolated CI database and broader tests | Commercial hosting, metrics, alerts, restore objectives and incident procedures |

## Mandatory launch gates

1. Choose commercial hosting and an operating budget. Vercel Hobby permits personal, non-commercial use and daily cron schedules. Default `vercel.json` remains suitable for a noncommercial preview. `vercel.production.json` is a Pro template, not an activated paid plan. [Vercel Hobby](https://vercel.com/docs/plans/hobby), [cron limitations](https://vercel.com/docs/cron-jobs/usage-and-pricing).
2. Rehearse migrations against a scrubbed populated backup. Resolve case-only email collisions explicitly. All existing users must sign in again because older sessions lack a session version. Retain old migrations and verify actual migration history.
3. Protect all historical resume assets. Newly private uploads do not retroactively make public Cloudinary URLs private. Verify download authorization, expiry, cleanup, document retention and deletion across PostgreSQL, Cloudinary, mail and provider records.
4. Validate paid/private-data Gemini processing, transactional email, Cloudinary, Google integrations and provider failures in staging. Synchronous AI currently delays application submission; isolate parsing and move scoring to a durable worker before significant traffic.
5. Complete merchant onboarding and payment test cases before enabling checkout. Stripe India is invitation-only; the included integration does not imply eligibility. [Stripe India account availability](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india?locale=en-GB).
6. Establish candidate-data processing terms, retention periods, request handling, subprocessors and international transfer arrangements. Baseline privacy/terms pages are not a reviewed DPA or legal approval. Indian rules have phased implementation; confirm applicable obligations for the actual launch. [MeitY rules](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025).
7. Monitor webhook failures, outbox dead letters, database availability, rate limits, AI spend and restore success. Configure reliable frequent scheduling on commercial hosting and test scheduler authentication.

## Release scope

Suitable product description: a recruiting workspace with applicant pipelines, interviews, agency client records, role-based access and bounded AI assistance. This remains an early SaaS foundation. Pricing, multi-currency checkout and client records do not by themselves provide a mature international agency operating system.
