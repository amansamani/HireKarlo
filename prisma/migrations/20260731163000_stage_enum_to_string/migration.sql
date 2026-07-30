-- JobApplication.stage was a fixed 7-value enum, but the custom-interview-round
-- feature lets a job define arbitrary round names that also need to work as
-- pipeline stages (e.g. "OA", "AI/ML Round") — those can never validly fit a
-- fixed enum. Converting to plain text; existing enum values carry over as-is
-- (Postgres enum labels cast directly to their text form).
ALTER TABLE "JobApplication" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "JobApplication" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;
ALTER TABLE "JobApplication" ALTER COLUMN "stage" SET DEFAULT 'APPLIED';
DROP TYPE IF EXISTS "ApplicationStage";