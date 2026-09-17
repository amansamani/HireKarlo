"use server";

import { reserveAiScore, lockOrganization } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomInt } from "crypto";
import { extractResumeText } from "@/lib/parse-resume";
import { scoreResumeAgainstJob } from "@/lib/score-resume";
import { sendEmail } from "@/lib/send-email";
import { applicationOtpEmail } from "@/lib/email-templates";

import { normalizeEmail, hashApplicationCode, checkApplicationCode } from "@/lib/application-otp";
import { allowAuthRequest } from "@/lib/rate-limit";

const OTP_TTL_MS = 10 * 60 * 1000;
const EmailSchema = z.string().trim().email("Please enter a valid email address.").transform(normalizeEmail);

export async function sendApplicationOtpAction(email: string) {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: "Please enter a valid email address." };

  if (!(await allowAuthRequest("application-otp", parsed.data, 3))) {
    return { error: "Too many codes requested for this email. Try again in 10 minutes." };
  }

  try {
    const otp = randomInt(100000, 1000000).toString();
    await prisma.applicationChallenge.upsert({
      where: { email: parsed.data },
      create: { email: parsed.data, codeHash: hashApplicationCode(parsed.data, otp), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
      update: { codeHash: hashApplicationCode(parsed.data, otp), attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    const { subject, html } = applicationOtpEmail(otp, "this role");
    await sendEmail(parsed.data, subject, html);

    return { success: "Verification code sent — check your inbox." };
  } catch (error) {
    console.error("[sendApplicationOtpAction] failed:", error);
    return { error: "Couldn't send the verification code. Check the email address and try again." };
  }
}

export async function verifyApplicationOtpAction(email: string, otp: string) {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: "Please enter a valid email address." };
  if (!otp || otp.trim().length !== 6) return { error: "Enter the 6-digit code." };

  try {
    if (!(await checkApplicationCode(parsed.data, otp.trim()))) return { error: "That code is invalid, expired, or has too many attempts." };
    return { success: "Email verified." };
  } catch (error) {
    console.error("[verifyApplicationOtpAction] failed:", error);
    return { error: "Couldn't verify that code. Please try again." };
  }
}

const ApplicationSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  candidateName: z.string().trim().max(120).min(2, "Name must be at least 2 characters"),
  candidateEmail: z.string().trim().email("Invalid email address").transform(normalizeEmail),
  resumeUploadId: z.string().uuid("Invalid resume upload."),
  otp: z.string().length(6, "Missing email verification code."),
  privacyAcknowledged: z.literal(true, { error: "Please acknowledge the privacy notice." }),
});

export async function submitApplicationAction(values: z.infer<typeof ApplicationSchema>) {
  const validatedFields = ApplicationSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Please fill out all fields correctly." };
  }

  const { jobId, candidateName, candidateEmail, resumeUploadId, otp } = validatedFields.data;

  try {
    if (!(await checkApplicationCode(candidateEmail, otp))) {
      return { error: "Please request a new email code: this one is invalid, expired, or used." };
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job || job.status !== "OPEN") {
      return { error: "This job posting is no longer active." };
    }

    const upload = await prisma.resumeUpload.findFirst({
      where: {
        id: resumeUploadId,
        jobId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!upload) {
      return { error: "Your resume upload is missing or has expired. Please upload it again." };
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

    const resumeUrl = upload.url;

    let matchScore: number | null = null;
    let aiSummary: string | null = null;

    if (resumeUrl && process.env.GEMINI_API_KEY) {
      try {
        const resumeText = await extractResumeText(resumeUrl);
        if (!resumeText.trim() || !(await reserveAiScore(job.organizationId))) throw new Error("No readable text or AI allowance exhausted");
        const score = await scoreResumeAgainstJob(resumeText, job.title, job.description ?? "");
        if (score) {
          matchScore = score.matchScore;
          aiSummary = score.summary;
        }
      } catch (scoringError) {
        console.error("Resume scoring failed, continuing without it:", scoringError);
      }
    }

    await prisma.$transaction(async tx => {
    const plan = await lockOrganization(tx, job.organizationId);
    const currentJob = await tx.job.findUnique({ where: { id: jobId }, select: { status: true } });
    if (currentJob?.status !== "OPEN") throw new Error("Job is closed");
    const consumedCode = await tx.applicationChallenge.deleteMany({ where: { email: candidateEmail, codeHash: hashApplicationCode(candidateEmail, otp), attempts: { lte: 5 }, expiresAt: { gt: new Date() } } });
    if (consumedCode.count !== 1) throw new Error("Email code expired or already used");
    const claimedUpload = await tx.resumeUpload.updateMany({ where: { id: upload.id, jobId, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (claimedUpload.count !== 1) throw new Error("Resume upload expired or already used");
    const existing = await tx.candidate.findUnique({ where: { email_organizationId: { email: candidateEmail, organizationId: job.organizationId } } });
    if (!existing && await tx.candidate.count({ where: { organizationId: job.organizationId } }) >= plan.limits.candidates) throw new Error("Candidate storage limit reached");
    const candidate = await tx.candidate.upsert({
      where: { email_organizationId: { email: candidateEmail, organizationId: job.organizationId } },
      create: {
        fullName: candidateName,
        email: candidateEmail,
        experience: 0,
        resumeUrl: resumeUrl || null,
        recruiterId: job.userId,
        organizationId: job.organizationId,
      },
      update: {
        fullName: candidateName,
        ...(resumeUrl ? { resumeUrl } : {}),
      },
    });

    await tx.jobApplication.create({
      data: {
        stage: "APPLIED",
        matchScore,
        aiSummary,
        resumeUrl,
        privacyAcknowledgedAt: new Date(),
        privacyNoticeVersion: "2026-09-16",
        job: {
          connect: { id: jobId }
        },
        candidate: {
          connect: { id: candidate.id }
        }
      },
    });

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

  try {
    if (!(await checkApplicationCode(parsed.data, otp.trim(), true))) {
      return { error: "That code is invalid, expired, or used." };
    }

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
