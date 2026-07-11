-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "matchScore" INTEGER;
