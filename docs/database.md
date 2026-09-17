# Database operations and model reference

PostgreSQL through Prisma 7.10 and `@prisma/adapter-pg`. The authoritative field definitions are `prisma/schema.prisma`; migrations are append-only. This pass adds migration **`20260917000000_reliability_guards`**, the 24th migration. It was verified locally, not applied to the configured live database.

## Models, important fields and relationships

| Model | Important fields / behavior |
|---|---|
| User | Unique normalized email, bcrypt password, verification timestamp, `sessionVersion`; memberships; creator attribution; owned organizations |
| Account / Session | Auth.js adapter tables; child rows cascade on user deletion; credentials sessions currently use JWTs |
| VerificationToken | Unique token and identifier/token pair; expiry; identifiers separate signup, password reset and interview experience namespaces |
| Organization | Owner FK, name, trial expiry (14 days), optional encrypted calendar token; root of tenant data |
| Membership | Unique organization/user; OWNER/ADMIN/RECRUITER/INTERVIEWER role; server context must check it on every protected access |
| TeamInvite | Unique organization/email and unique bearer token, role, expiry; pending hiring-role invitations reserve plan seats |
| AgencyClient | Tenant-owned client name, contact email, notes; jobs reference client; referenced client deletion restricted |
| Job | Tenant, creator, optional client, status, custom interview rounds, description; indexed organization/creator |
| Candidate | Tenant, creator, name/contact/profile fields, skills, optional stored resume URL; unique email per organization and organization/creation index |
| ResumeUpload | UUID, job, provider public ID and URL, expiry/consumption; indexed job/expiry; used for private asset resolution and cleanup |
| JobApplication | Unique candidate/job, stage, own resume snapshot, privacy acknowledgement/time/version, optional AI score/summary; indexed job/stage |
| Interview | Application, optional assigned user, round and `pipelineStage`, schedule/duration, event/link, feedback/result, reviewer rating, candidate experience rating, reminder intent timestamp |
| ActivityLog | Application, actor, action/details/time; retained creator attribution |
| ApplicationChallenge / RateLimit | HMAC code, incorrect-guess count/expiry; hashed fixed-window request keys and atomic counts |
| Subscription / BillingCheckout / BillingEvent | Organization subscription/current provider state; one pending checkout per organization; unique processed event IDs |
| UsageCounter | Unique organization/period; counts provider AI attempts; trial period separate from subscription billing period |
| EmailOutbox | Recipient/template/attachments, optional unique dedupe key, attempts/availability, lease and UUID lease token, sent/dead-letter timestamps |
| AiScoringJob | Application PK/FK, attempts/availability, lease/token, completed/failed timestamps and safe reason code; one current review job per application |

Organization deletion cascades its tenant records. Creator and organization-owner user FKs now **restrict** deletion rather than removing shared hiring records. Removing a teammate removes membership, not their account or attribution. Ownership alone does not replace a valid membership. User deletion requires an explicit retention/ownership-transfer design; there is no automatic account-delete feature.

New SQL checks restrict membership/invitation roles, interview duration (15–480), ratings (1–5), and scores (0–100). Several are `NOT VALID`: new writes are checked immediately, while old rows require a later controlled validation. `npm run db:preflight` reports incompatible old rows without editing them. Zero results are a compatibility check, not a backup or a complete migration guarantee.

## Transactions and queries

- Plan-capacity writes lock the organization with parameterized `SELECT ... FOR UPDATE` before counts/writes.
- Scheduling locks the organization and application before overlap detection/reservation. Stage writes lock the application; cancelling checks its fresh stage and other interviews for that specific pipeline round.
- OTP checks lock the challenge; only incorrect codes increment guesses. Application creation consumes the live challenge and upload in its business transaction.
- Signup/reset/invites, stage changes, scheduling/cancellation and reminders couple delivery intent to business writes. Workers acknowledge only their lease token. SMTP remains at least once: a crash after provider acceptance can duplicate an email.
- AI completion acknowledges the owned lease and writes score/summary atomically. The pending-job index supports recovery selection. Each provider attempt consumes a quota credit, including failed calls; bounded retries can consume three credits.
- Lists use projections and bounded pages; candidate/job/interview pools are paginated, applicants use pages of 100, client pages 25 and activity feeds 50. CSV export still materializes the full tenant export; benchmark before large datasets.

Per-process pool default is five connections (configurable 1–20), five-second connection timeout, ten-second client query timeout and thirty-second idle timeout. Serverless instance count multiplies connections; use the provider's pooled URL and monitor total connections. Client timeout is not a guarantee of server-side cancellation. SQL locks acquired in transactions are released on commit/rollback.

## Local database and seed

Use local PostgreSQL or optional `docker compose up -d postgres` (loopback port 5433). Compose uses explicitly nonproduction credentials and a persistent local volume; never use it as an exposed production server.

```env
DATABASE_URL="postgresql://hirekarlo_audit:local_audit_only@localhost:5433/hirekarlo_audit"
```

```sh
npm run db:deploy
npm run db:preflight
# Set SEED_DEMO_PASSWORD privately in the shell before this command.
npm run db:seed
```

The seed and mutating test fixtures refuse nonlocal hosts or any database name other than `hirekarlo_audit`. The seed creates a verified `demo-owner@example.test`, workspace, client, job, synthetic candidate and application. Repeating it preserves the existing password and records. Optional external provider calls are unnecessary for the seeded journey. Keep development, browser tests, previews and live customer databases separate.

## Safe release, backup and restore

1. Confirm the target connection privately; `npx prisma migrate status` is read-only. Run `npm run db:preflight` and resolve nonzero counts.
2. Take a provider snapshot and an encrypted, access-controlled `pg_dump -Fc` backup. Keep credentials out of shell arguments/history; use a protected `.pgpass` or private process environment. Record RPO/RTO and backup retention with the operator.
3. Restore into a **separate** environment with `pg_restore --exit-on-error`. Compare migration count, schema, representative tenant/application/outbox records and authorized access. Never overwrite the live database to test a restore.
4. Replay migrations on staging and verify schema alignment: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
5. During a controlled maintenance window, explicitly run `npm run db:deploy` against the intended live connection **before deploying code that reads the new columns/table**. Builds never run migrations automatically.
6. Run core health and authenticated smoke checks. Retain backup and release identifiers.

No `migrate reset`, `db push` or migration editing against live data. Roll back application code only if compatible with the migrated schema. A destructive schema rollback needs a separately reviewed forward correction or restoration with a write freeze and explicit data-loss assessment. This pass rehearsed local recovery only; live provider backup and recovery procedures remain externally unverified.
