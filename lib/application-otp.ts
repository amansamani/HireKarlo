import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function hashApplicationCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", secret).update(`${normalizeEmail(email)}:${code}`).digest("hex");
}

export async function checkApplicationCode(email: string, code: string, consume = false): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  email = normalizeEmail(email);
  return prisma.$transaction(async tx => {
    // The same challenge protects uploads, submission and status checks. Only
    // wrong guesses use the allowance, so successful upload + submit can finish
    // even after four incorrect guesses. A row lock serializes all entry points.
    await tx.$queryRaw`SELECT "email" FROM "ApplicationChallenge" WHERE "email" = ${email} FOR UPDATE`;
    const record = await tx.applicationChallenge.findUnique({ where: { email } });
    if (!record || record.attempts >= 5 || record.expiresAt <= new Date()) return false;
    const expected = Buffer.from(record.codeHash, "hex"), actual = Buffer.from(hashApplicationCode(email, code), "hex");
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!valid) await tx.applicationChallenge.update({ where: { email }, data: { attempts: { increment: 1 } } });
    else if (consume) await tx.applicationChallenge.delete({ where: { email } });
    return valid;
  });
}
