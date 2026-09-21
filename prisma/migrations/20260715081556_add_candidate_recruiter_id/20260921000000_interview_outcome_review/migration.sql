-- Interview outcome workflow: a FAILED scorecard opens a recruiter decision gate instead of
-- touching the candidate. Additive only; no existing row is rewritten except the scorecard timestamp backfill.
ALTER TABLE "Interview"
  ADD COLUMN "scheduledById" TEXT,
  ADD COLUMN "scorecardSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewStatus" TEXT,
  ADD COLUMN "reviewAssigneeId" TEXT,
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewNote" TEXT;

-- Approximate the submission time for scorecards that already exist.
UPDATE "Interview" SET "scorecardSubmittedAt" = "updatedAt" WHERE "result" IS NOT NULL;

-- 'PENDING' is a legacy value the old UI could persist; new writes are PASSED/FAILED only.
-- NOT VALID: enforced for new/updated rows without failing the deploy on unexpected old data.
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_result_check"
  CHECK ("result" IS NULL OR "result" IN ('PASSED','FAILED','PENDING')) NOT VALID;

ALTER TABLE "Interview" ADD CONSTRAINT "Interview_review_status_check"
  CHECK ("reviewStatus" IS NULL OR "reviewStatus" IN ('PENDING_REVIEW','REJECTION_CONFIRMED','OVERRIDDEN'));

-- A decision gate can only exist for a failed scorecard.
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_review_requires_failed_check"
  CHECK ("reviewStatus" IS NULL OR "result" = 'FAILED');

-- Every resolved decision records who made it and when.
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_review_decision_check"
  CHECK ("reviewStatus" IS NULL OR "reviewStatus" = 'PENDING_REVIEW' OR ("reviewedAt" IS NOT NULL AND "reviewedById" IS NOT NULL));

CREATE INDEX "Interview_reviewStatus_reviewAssigneeId_idx" ON "Interview"("reviewStatus", "reviewAssigneeId");
