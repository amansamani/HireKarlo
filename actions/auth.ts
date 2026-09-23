"use server";
import { hashBearerToken, bearerTokenCandidates } from "@/lib/bearer-token";
import { logError } from "@/lib/logger";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import { generateVerificationToken } from "@/lib/generate-token";
import { enqueueEmail, dispatchQueuedEmail } from "@/lib/send-email";
import { verifyEmailTemplate, resetPasswordEmailTemplate } from "@/lib/email-templates";

import { normalizeEmail } from "@/lib/application-otp";
import { allowAuthRequest } from "@/lib/rate-limit";

const passwordRule = z
  .string()
  .max(72, "Password must be at most 72 UTF-8 bytes")
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes");

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().max(254).email("Invalid email address").transform(normalizeEmail),
  password: passwordRule,
});

const LoginSchema = z.object({
  email: z.string().trim().max(254).email("Invalid email address").transform(normalizeEmail),
  password: z.string().min(6, "Password must be at least 6 characters").max(72).refine(value => Buffer.byteLength(value,"utf8") <= 72,"Password must be at most 72 UTF-8 bytes"),
});

export async function registerAction(values: z.infer<typeof RegisterSchema>) {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields provided." };
  }

  const { name, email, password } = validatedFields.data;
  const pilotAllowlist = process.env.PILOT_SIGNUP_EMAILS?.split(",").map(normalizeEmail).filter(Boolean);
  if ((process.env.NODE_ENV === "production" && !pilotAllowlist?.length) || (pilotAllowlist?.length && !pilotAllowlist.includes(email))) {
    return { error: "HireKarlo is running a private pilot. Contact amanworkinfo@gmail.com for access." };
  }
  try {
    if (!(await allowAuthRequest("register", email, 3))) return { error: "Too many requests. Try again later." };
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return { error: "Email already in use!" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const token = generateVerificationToken();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const { subject, html } = verifyEmailTemplate(name, verifyUrl);
    const queuedId = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: `${name.trim()}'s Organization`,
          ownerId: createdUser.id,
        },
      });

      await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: createdUser.id,
          role: "OWNER",
        },
      });

      await tx.verificationToken.deleteMany({ where: { identifier: email } });
      await tx.verificationToken.create({ data: { identifier: email, token: hashBearerToken(token), expires: new Date(Date.now() + 86_400_000) } });
      return enqueueEmail(tx, email, subject, html, undefined, undefined, new Date(Date.now() + 86_400_000));
    });
    dispatchQueuedEmail(queuedId);

    return { success: "Account created. Check your email for the verification link." };
    
  } catch (error) {
    logError("actions.auth", error);

    // FIXED: Removed ': any' from catch block and applied structural casting to evaluate the error code safely
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      return { error: "Email already in use!" };
    }

    return {
      error:
        "We could not create your account. Please try again or contact support.",
    };
  }
}

const RequestResetSchema = z.object({
  email: z.string().trim().max(254).email("Invalid email address").transform(normalizeEmail),
});

export async function resendVerificationAction(values: z.infer<typeof RequestResetSchema>) {
  const parsed = RequestResetSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter a valid email address." };
  const { email } = parsed.data;
  try {
    if (!(await allowAuthRequest("resend-verification", email, 3))) return { error: "Too many requests. Try again later." };
    const user = await prisma.user.findUnique({ where: { email }, select: { name: true, emailVerified: true } });
    if (user && !user.emailVerified) {
      const token = generateVerificationToken();
      const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      const template = verifyEmailTemplate(user.name ?? "there", url);
      const queuedId = await prisma.$transaction(async tx => {
        await tx.verificationToken.deleteMany({ where: { identifier: email } });
        await tx.verificationToken.create({ data: { identifier: email, token: hashBearerToken(token), expires: new Date(Date.now() + 86_400_000) } });
        return enqueueEmail(tx, email, template.subject, template.html, undefined, undefined, new Date(Date.now() + 86_400_000));
      });
      dispatchQueuedEmail(queuedId);
    }
    return { success: "If this account needs verification, an email is on its way." };
  } catch {
    return { error: "Couldn't queue a verification email. Contact support if this continues." };
  }
}

export async function requestPasswordResetAction(values: z.infer<typeof RequestResetSchema>) {
  const validatedFields = RequestResetSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid email address." };
  }

  const { email } = validatedFields.data;

  // Separate namespace from the register-flow verify token (identifier: email)
  // and the public-apply OTP (identifier: "apply-otp:<email>") — same table,
  // same convention used elsewhere in this file.
  const identifier = `reset-password:${email}`;

  try {
    if (!(await allowAuthRequest("password-reset", email, 3))) return { error: "Too many requests. Try again later." };
    const user = await prisma.user.findUnique({ where: { email }, select: { name: true } });

    if (user) {
      const token = generateVerificationToken();
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      const template = resetPasswordEmailTemplate(user.name ?? "there", resetUrl);
      const queuedId = await prisma.$transaction(async tx => {
        await tx.verificationToken.deleteMany({ where: { identifier } });
        await tx.verificationToken.create({ data: { identifier, token: hashBearerToken(token), expires: new Date(Date.now() + 3_600_000) } });
        return enqueueEmail(tx, email, template.subject, template.html, undefined, undefined, new Date(Date.now() + 3_600_000));
      });
      dispatchQueuedEmail(queuedId);
    }
    return { success: "If an account exists for that email, a reset link is on its way." };
  } catch (error) {
    logError("actions.auth", error);
    return { error: "Something went wrong. Please try again." };
  }
}

const ResetPasswordSchema = z.object({
  email: z.string().trim().max(254).email("Invalid email address").transform(normalizeEmail),
  token: z.string().min(1, "Missing reset token."),
  password: passwordRule,
});

export async function resetPasswordAction(values: z.infer<typeof ResetPasswordSchema>) {
  const validatedFields = ResetPasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, token, password } = validatedFields.data;
  const identifier = `reset-password:${email}`;

  try {
    const record = await prisma.verificationToken.findFirst({
      where: { identifier, token: { in: bearerTokenCandidates(token) } },
    });

    if (!record || record.expires < new Date()) {
      if (record) {
        await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token: record.token } } });
      }
      return { error: "This reset link is invalid or has expired. Request a new one." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.verificationToken.deleteMany({ where: { identifier, token: { in: bearerTokenCandidates(token) }, expires: { gt: new Date() } } });
      if (consumed.count !== 1) throw new Error("Reset token expired or already used");
      await tx.user.update({ where: { email }, data: { password: hashedPassword, sessionVersion: { increment: 1 } } });
    });

    return { success: "Password updated — you can log in now." };
  } catch (error) {
    logError("actions.auth", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function loginAction(values: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields." };
  }

  const { email, password } = validatedFields.data;
  try {
    if (!(await allowAuthRequest("login", email))) return { error: "Too many login attempts. Try again later." };
    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.password) {
      const passwordsMatch = await bcrypt.compare(password, user.password);
      if (passwordsMatch && !user.emailVerified) {
        return { error: "Please verify your email before logging in — check your inbox." };
      }
    }

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: "Logged in successfully!" };
  } catch (error) {
    logError("actions.auth", error);

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
        case "CallbackRouteError":
          return { error: "Invalid credentials!" };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error;
  }
}
