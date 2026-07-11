"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";

const ApplicationSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  candidateName: z.string().min(2, "Name must be at least 2 characters"),
  candidateEmail: z.string().email("Invalid email address"),
  resumeUrl: z.string().optional(),
});

export async function submitApplicationAction(values: z.infer<typeof ApplicationSchema>) {
  const validatedFields = ApplicationSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Please fill out all fields correctly." };
  }

  const { jobId, candidateName, candidateEmail, resumeUrl } = validatedFields.data;

  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return { error: "This job posting is no longer active." };
    }

    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        jobId,
        candidate: { email: candidateEmail }
      }
    });

    if (existingApplication) {
      return { error: "You have already submitted an application for this job opening." };
    }

    // Best-effort resume scoring — never blocks submission if it fails
    let matchScore: number | null = null;
    let aiSummary: string | null = null;

    if (resumeUrl) {
      try {
        const resumeText = await extractResumeText(resumeUrl);
        const score = await scoreResumeAgainstJob(resumeText, job.title, job.description ?? "");
        if (score) {
          matchScore = score.matchScore;
          aiSummary = score.summary;
        }
      } catch (scoringError) {
        console.error("Resume scoring failed, continuing without it:", scoringError);
      }
    }

    await prisma.jobApplication.create({
      data: {
        stage: "APPLIED",
        matchScore,
        aiSummary,
        job: {
          connect: { id: jobId }
        },
        candidate: {
          connectOrCreate: {
            where: { email: candidateEmail },
            create: {
              fullName: candidateName,
              email: candidateEmail,
              experience: 0,
              resumeUrl: resumeUrl || null
            }
          }
        }
      },
    });

    return { success: "Your application has been submitted successfully!" };
  } catch (error) {
    console.error("Public submission error:", error);
    return { error: "An error occurred while submitting your application." };
  }
}