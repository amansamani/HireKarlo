"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomInt } from "crypto";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";
import { sendEmail } from "@/lib/send-email";
import { applicationOtpEmail } from "@/lib/email-templates";

const OTP_TTL_MS = 10 * 60 * 1000;
const otpIdentifier = (email: string) => `apply-otp:${email.toLowerCase().trim()}`;

const EmailSchema = z.string().trim().email("Please enter a valid email address.");
const SEND_WINDOW_MS = 10 * 60 * 1000;

const SEND_MAX = 3;
const sendAttempts = new Map<string, number[]>();

const VERIFY_MAX_ATTEMPTS = 5;
const verifyAttempts = new Map<string, number>();

function isSendRateLimited(identifier: string): boolean {
  const now = Date.now();
  const attempts = (sendAttempts.get(identifier) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  attempts.push(now);
  sendAttempts.set(identifier, attempts);
  return attempts.length > SEND_MAX;
}

export async function sendApplicationOtpAction(email: string) {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: "Please enter a valid email address." };

  const identifier = otpIdentifier(parsed.data);
  if (isSendRateLimited(identifier)) {
    return { error: "Too many codes requested for this email. Try again in 10 minutes." };
  }

  try {
   
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    verifyAttempts.delete(identifier);
    let otp = "";
    let created = false;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      otp = randomInt(100000, 1000000).toString();
      try {
        await prisma.verificationToken.create({
          data: { identifier, token: otp, expires: new Date(Date.now() + OTP_TTL_MS) },
        });
        created = true;
      } catch (createError) {
        const prismaError = createError as { code?: string };
        if (prismaError?.code !== "P2002") throw createError;
      }
    }
    if (!created) return { error: "Couldn't generate a code, please try again." };

    const { subject, html } = applicationOtpEmail(otp, "this role");
    await sendEmail(parsed.data, subject, html);

    return { success: "Verification code sent — check your inbox." };
  } catch (error) {
    console.error("[sendApplicationOtpAction] failed:", error);
    return { error: "Couldn't send the verification code. Check the email address and try again." };
  }
}

export async function verifyApplicationOtpAction(email: string, otp: string) {
  const identifier = otpIdentifier(parsed.data);
  const attempts = verifyAttempts.get(identifier) ?? 0;
  if (attempts >= VERIFY_MAX_ATTEMPTS) {
    return { error: "Too many incorrect attempts. Request a new code." };
  }

  try {
    const record = await prisma.verificationToken.findFirst({
      where: { identifier, token: otp.trim() },
    });

    if (!record || record.expires < new Date()) {
      verifyAttempts.set(identifier, attempts + 1);
      return { error: "That code is invalid or expired. Request a new one." };
    }

    verifyAttempts.delete(identifier);
    return { success: "Email verified." };
  } catch (error) {
    console.error("[verifyApplicationOtpAction] failed:", error);
    return { error: "Couldn't verify that code. Please try again." };
  }
}

const ApplicationSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  candidateName: z.string().min(2, "Name must be at least 2 characters"),
  candidateEmail: z.string().email("Invalid email address"),
  resumeUrl: z.string().optional(),
  otp: z.string().length(6, "Missing email verification code."),
});

export async function submitApplicationAction(values: z.infer<typeof ApplicationSchema>) {
  const validatedFields = ApplicationSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Please fill out all fields correctly." };
  }

  const { jobId, candidateName, candidateEmail, resumeUrl, otp } = validatedFields.data;

  try {
   
    const identifier = otpIdentifier(candidateEmail);
    const tokenRecord = await prisma.verificationToken.findFirst({ where: { identifier, token: otp } });

    if (!tokenRecord || tokenRecord.expires < new Date()) {
      return { error: "Please verify your email again — the code expired or wasn't found." };
    }

    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token: otp } },
    });

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job || job.status !== "OPEN") {
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

    const candidate = await prisma.candidate.upsert({
      where: { email_recruiterId: { email: candidateEmail, recruiterId: job.userId } },
      create: {
        fullName: candidateName,
        email: candidateEmail,
        experience: 0,
        resumeUrl: resumeUrl || null,
        recruiterId: job.userId,
      },
      update: {
        fullName: candidateName,
        ...(resumeUrl ? { resumeUrl } : {}),
      },
    });

    await prisma.jobApplication.create({
      data: {
        stage: "APPLIED",
        matchScore,
        aiSummary,
        job: {
          connect: { id: jobId }
        },
        candidate: {
          connect: { id: candidate.id }
        }
      },
    });

    return { success: "Your application has been submitted successfully!" };
  } catch (error) {
    console.error("Public submission error:", error);
    return { error: "An error occurred while submitting your application." };
  }
}

export async function getApplicationStatusAction(email: string, otp: string) {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: "Please enter a valid email address." };
  if (!otp || otp.trim().length !== 6) return { error: "Enter the 6-digit code." };

  const identifier = otpIdentifier(parsed.data);

  try {
    const record = await prisma.verificationToken.findFirst({ where: { identifier, token: otp.trim() } });
    if (!record || record.expires < new Date()) {
      return { error: "That code is invalid or expired. Request a new one." };
    }
    // Consume it — status checks are one-shot per code, same as applying.
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token: otp.trim() } } }).catch(() => {});

    const applications = await prisma.jobApplication.findMany({
      where: { candidate: { email: parsed.data } },
      select: {
        stage: true,
        appliedDate: true,
        job: { select: { title: true, department: true } },
      },
      orderBy: { appliedDate: "desc" },
    });

    return { applications };
  } catch (error) {
    console.error("[getApplicationStatusAction] failed:", error);
    return { error: "Couldn't load application status. Please try again." };
  }
}