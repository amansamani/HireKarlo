CREATE TABLE "ResumeUpload" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeUpload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResumeUpload_jobId_expiresAt_idx" ON "ResumeUpload"("jobId", "expiresAt");

ALTER TABLE "ResumeUpload"
ADD CONSTRAINT "ResumeUpload_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
