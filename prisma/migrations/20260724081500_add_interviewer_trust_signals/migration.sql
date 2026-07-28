-- Minimal trust-signal layer for interviewers: a short bio, and a per-session
-- rating of the interviewer (distinct from `rating`, which is the interviewer's
-- own rating of the candidate). Both nullable, no backfill needed.
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "Interview" ADD COLUMN "interviewerRating" INTEGER;