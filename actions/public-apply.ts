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

export async function sendApplicationOtpAction(email: string) {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: "Please enter a valid email address." };

  const identifier = otpIdentifier(parsed.data);

  try {
    // Only one live code per email at a time — clear any previous one first
    // (VerificationToken's unique key is [identifier, token], not identifier
    // alone, so a plain upsert can't target "whatever code this email has now").
    await prisma.verificationToken.deleteMany({ where: { identifier } });

    // `token` is globally @unique across ALL identifiers in this table, not
    // just per-email — with a 6-digit space, two applicants requesting a
    // code around the same moment can genuinely collide. Retry on that.
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
        // FIXED: Checked type-safe properties using structural checking to satisfy linter
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
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { error: "Please enter a valid email address." };
  if (!otp || otp.trim().length !== 6) return { error: "Enter the 6-digit code." };

  try {
    // Peek only — don't consume yet. The real, authoritative check happens
    // again in submitApplicationAction so a client that skips this call
    // can't just fake "verified" and submit anyway.
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: otpIdentifier(parsed.data), token: otp.trim() },
    });

    if (!record || record.expires < new Date()) {
      return { error: "That code is invalid or expired. Request a new one." };
    }

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
    // Authoritative email-verification check. The earlier "verify" step only
    // peeked at the code for instant UI feedback; this is where it's actually
    // consumed, so a request that never went through OTP verification (or
    // whose code has since expired/been reused) can't slip through.
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