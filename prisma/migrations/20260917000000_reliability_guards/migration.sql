ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_recruiterId_fkey";
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" DROP CONSTRAINT "Job_userId_fkey";
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailOutbox" ADD COLUMN "leaseToken" TEXT;
CREATE TABLE "AiScoringJob" (
  "applicationId" TEXT PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT, "completedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiScoringJob_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AiScoringJob_completedAt_failedAt_availableAt_idx" ON "AiScoringJob"("completedAt", "failedAt", "availableAt");
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_role_check" CHECK ("role" IN ('OWNER','ADMIN','RECRUITER','INTERVIEWER')) NOT VALID;
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_role_check" CHECK ("role" IN ('ADMIN','RECRUITER','INTERVIEWER')) NOT VALID;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_duration_check" CHECK ("durationMinutes" BETWEEN 15 AND 480) NOT VALID;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_rating_check" CHECK (("rating" IS NULL OR "rating" BETWEEN 1 AND 5) AND ("interviewerRating" IS NULL OR "interviewerRating" BETWEEN 1 AND 5)) NOT VALID;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_score_check" CHECK ("matchScore" IS NULL OR "matchScore" BETWEEN 0 AND 100) NOT VALID;

ALTER TABLE "Interview" ADD COLUMN "candidateExperienceRating" INTEGER;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_experience_rating_check" CHECK ("candidateExperienceRating" IS NULL OR "candidateExperienceRating" BETWEEN 1 AND 5);
ALTER TABLE "Interview" ADD COLUMN "pipelineStage" TEXT;
