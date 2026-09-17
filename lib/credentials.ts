import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/application-otp";
import { allowAuthRequest } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export async function authorizeCredentials(values: unknown) {
  const parsed = z.object({ email: z.string().trim().max(254).email().transform(normalizeEmail), password: z.string().min(6).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72) }).safeParse(values);
  if (!parsed.success) return null;
  try {
    if (!(await allowAuthRequest("authorize", parsed.data.email))) return null;
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user?.password || !user.emailVerified || !(await bcrypt.compare(parsed.data.password, user.password))) return null;
    return user;
  } catch (error) { logError("auth.credentials_failed", error); return null; }
}
