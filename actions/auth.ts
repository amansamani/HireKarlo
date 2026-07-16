"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import { generateVerificationToken } from "@/lib/generate-token";
import { sendEmail } from "@/lib/send-email";
import { verifyEmailTemplate } from "@/lib/email-templates";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordRule,
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerAction(values: z.infer<typeof RegisterSchema>) {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields provided." };
  }

  const { name, email, password } = validatedFields.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return { error: "Email already in use!" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = generateVerificationToken();
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    const { subject, html } = verifyEmailTemplate(name, verifyUrl);

    try {
      await sendEmail(email, subject, html);
    } catch (emailErr) {
      console.error("[registerAction] verification email failed:", emailErr);
    }

    return { success: "Account created! ..." };
    
  } catch (error) {
    console.error("[registerAction] failed:", error);

    // FIXED: Removed ': any' from catch block and applied structural casting to evaluate the error code safely
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      return { error: "Email already in use!" };
    }

    return {
      error:
        "Something went wrong during registration. Check your server logs / DATABASE_URL.",
    };
  }
}

export async function loginAction(values: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields." };
  }

  const { email, password } = validatedFields.data;

  try {
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
    console.error("[loginAction] failed:", error);

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