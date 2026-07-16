-- Corrective, idempotent migration.
-- Root cause: 20260715081556_add_candidate_recruiter_id adds
-- Candidate.recruiterId as NOT NULL with no default, in the SAME
-- transaction as Job.interviewRounds. If Candidate already had rows,
-- that ALTER TABLE fails and the whole migration rolls back —
-- silently taking Job.interviewRounds down with it, even though
-- Prisma Client (generated from schema.prisma) already expects the
-- column. Every job create then fails with an "unknown column"
-- error from Postgres.
--
-- This migration re-applies both columns only if missing, backfills
-- recruiterId from existing JobApplication -> Job ownership before
-- enforcing NOT NULL, and is a no-op if the original migration
-- actually succeeded.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Job' AND column_name = 'interviewRounds'
  ) THEN
    EXECUTE 'ALTER TABLE "Job" ADD COLUMN "interviewRounds" TEXT[] DEFAULT ARRAY[]::TEXT[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Candidate' AND column_name = 'recruiterId'
  ) THEN
    EXECUTE 'ALTER TABLE "Candidate" ADD COLUMN "recruiterId" TEXT';

    -- Backfill from the job each candidate applied to first.
    UPDATE "Candidate" c
    SET "recruiterId" = sub."userId"
    FROM (
      SELECT DISTINCT ON (ja."candidateId") ja."candidateId", j."userId"
      FROM "JobApplication" ja
      JOIN "Job" j ON j.id = ja."jobId"
      ORDER BY ja."candidateId", ja."appliedDate" ASC
    ) sub
    WHERE c.id = sub."candidateId" AND c."recruiterId" IS NULL;

    -- Orphan candidates with no application: fall back to the
    -- earliest-created user so NOT NULL can still be enforced.
    -- Review these rows manually afterward if this matches any.
    UPDATE "Candidate"
    SET "recruiterId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
    WHERE "recruiterId" IS NULL;

    EXECUTE 'ALTER TABLE "Candidate" ALTER COLUMN "recruiterId" SET NOT NULL';

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'Candidate' AND indexname = 'Candidate_email_recruiterId_key'
    ) THEN
      EXECUTE 'DROP INDEX IF EXISTS "Candidate_email_key"';
      EXECUTE 'CREATE UNIQUE INDEX "Candidate_email_recruiterId_key" ON "Candidate"("email", "recruiterId")';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'Candidate' AND constraint_name = 'Candidate_recruiterId_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE';
    END IF;
  END IF;
END $$;
