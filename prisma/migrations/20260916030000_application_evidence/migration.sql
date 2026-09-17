ALTER TABLE "JobApplication" ADD COLUMN "resumeUrl" TEXT, ADD COLUMN "privacyAcknowledgedAt" TIMESTAMP(3), ADD COLUMN "privacyNoticeVersion" TEXT;
-- Preserve a best-effort historical snapshot; original uploads per application
-- cannot be reconstructed when a pooled candidate's resume was overwritten.
UPDATE "JobApplication" ja SET "resumeUrl" = c."resumeUrl" FROM "Candidate" c WHERE c.id = ja."candidateId";
