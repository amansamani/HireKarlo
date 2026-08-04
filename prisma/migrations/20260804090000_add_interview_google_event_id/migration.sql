-- Needed to actually cancel a Google Calendar event when an interview is
-- deleted — createMeetEvent was only ever returning the Meet link, throwing
-- the event id away, which made cancellation impossible until now.
ALTER TABLE "Interview" ADD COLUMN "googleEventId" TEXT;