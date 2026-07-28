-- One Google Calendar connection per Organization (not per-user) — whoever
-- connects it (usually the owner), interviews scheduled after that get an
-- auto-generated Meet link on that calendar. Both nullable, no backfill.
ALTER TABLE "Organization" ADD COLUMN "googleCalendarEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleRefreshToken" TEXT;
ALTER TABLE "Interview" ADD COLUMN "meetingLink" TEXT;