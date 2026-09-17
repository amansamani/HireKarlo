# Security boundaries and unresolved launch gates

Reviewed 17 September 2026. This describes implementation and targeted checks, not a security certification or independent penetration test.

## Authentication and access

Auth.js credentials authenticate normalized emails against bcrypt and require verified email. Login and signup/reset requests use shared database counters. JWT sessions carry the user's session version; server access checks reject revoked versions and removed memberships. Password reset increments the version atomically with one-time token consumption. New passwords require eight characters, uppercase, digit and symbol, and at most 72 UTF-8 bytes to prevent bcrypt truncation ambiguity. Legacy passwords longer than that boundary need reset.

`requireOrg` selects only a current membership, including a membership-checked workspace cookie. OWNER/ADMIN manage teams; OWNER manages billing; RECRUITER handles hiring; INTERVIEWER is restricted to authorized assigned-interview work. Unknown roles fail closed. Proxy redirects help navigation; every action/route must separately authorize its database access. Tenant IDs supplied by a browser never grant access. PostgreSQL RLS is not implemented: application scope checks are the tenant boundary.

Verification/reset/experience tokens are scoped and single-use. Experience links are bearer links: anyone possessing one can submit the rating; they do not prove candidate identity. Candidate experience is stored separately from the recruiter's interviewer rating. Applicant OTPs use HMAC and constant-time comparison, expire in ten minutes, and lock after five incorrect guesses across entry points. Upload requires a live valid OTP; submission consumes it transactionally.

## Inputs, data and providers

Zod validates business inputs on the server. Prisma and tagged SQL parameterize values; no interpolated SQL identifiers from users. React escapes rendered text, email templates escape user content, and CSV cells guard spreadsheet formula prefixes and quote escaping. New documents use authenticated Cloudinary raw assets; authorized routes produce short-lived downloads and avoid raw URLs in list/export responses. Upload/download size is bounded to 3 MiB. DOCX validation bounds actual expansion (8 MiB per entry, 20 MiB total, 2,000 entries), rejects traversal/duplicates/encryption/unsupported compression and unsafe XML declarations before Mammoth.

These checks are **not malware scanning or parser isolation**. PDF structure/CPU behavior is not fully sandboxed. Legacy public assets remain public outside application controls. Migrate those assets, inventory third-party retention/backups and establish deletion procedures before collecting sensitive customer resumes at scale.

Gemini results are schema-validated and bounded. The prompt labels resume/job text untrusted and excludes protected-characteristic assessment. Prompt wording does not guarantee resistance to manipulation or fairness. Scores support human review and never automatically move stages or reject candidates. Live accuracy/fairness/provider data-handling evaluation is required before professional hiring use.

## Secrets, logs and analytics

`.env` is ignored; `.env.example` contains placeholders only. Keep separate credentials for local, CI, preview and live. Rotate compromised keys; never paste environment files into logs/support tickets. Google refresh tokens are encrypted with AES-GCM on new writes; a legacy plaintext fallback still exists. Inventory and migrate old tokens; keep a strong encryption key stable or encrypted tokens become unreadable.

Application error logging emits only a fixed event name and a constrained error code. It drops error messages, stacks, resume text, emails, credentials, raw provider bodies and URLs. Framework/platform logs and access URLs still require review, restricted access and retention controls. Analytics requires consent, mounts only on marketing pages and filters events to those pages while stripping queries/fragments; account, token, applicant and workspace views are discarded even if a script remains mounted during navigation.

## HTTP and deployment

Auth.js and Next.js enforce their own CSRF/origin protocols. No general credentialed cross-origin API is exposed. Static public responses may have platform CORS headers; that does not grant authenticated application access. `nosniff`, frame denial, no-referrer and limited browser permissions are configured, with HSTS in production. Sensitive routes receive `X-Robots-Tag: noindex, nofollow`; robots is not access control. Strict nonce-based CSP remains a hardening task. Trust forwarded IP/host headers only behind a proxy that overwrites them; an arbitrary self-hosted reverse proxy requires configuration.

Cron endpoints require the private bearer secret. No unauthenticated debug/seed endpoint exists; the local seed/test host-and-database-name guard is enforced before mutations. Database pooling/timeouts and durable bounded retries reduce resource failures, but distributed abuse, email provider quotas, file parser CPU and instance-wide connection limits still need operational monitoring.

## Required external verification

- Legacy document/token migration and retention/deletion inventory.
- Independent tenant/IDOR, session/CSRF, upload abuse and parser resource testing with staging accounts.
- Live SMTP delivery/rate limits, Cloudinary privacy/deletion and signed download expiry, Google OAuth consent/token rotation, Gemini failures/output quality.
- Merchant approval and actual signed payment lifecycle/reconciliation tests before charging anyone.
- Operator access controls, provider backups/restore, monitoring and incident response; professional review of privacy/data processing and international hiring requirements.

Report a suspected issue privately to **amanworkinfo@gmail.com**. Include a safe reproduction with synthetic data; do not include real resumes, credentials or exploit secrets in public issues.
