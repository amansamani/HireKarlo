-- Links an Interview to a real HireKarlo account instead of only the free-text
-- `interviewer` display name. Nullable + ON DELETE SET NULL: existing interviews
-- (and future ones for interviewers with no HireKarlo account) keep working with
-- just the display name, unaffected.
ALTER TABLE "Interview" ADD COLUMN "interviewerId" TEXT;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Interview_interviewerId_idx" ON "Interview"("interviewerId");