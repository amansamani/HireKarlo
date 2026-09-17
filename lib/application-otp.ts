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
  return prisma.$transaction(async (tx) => {
    // Increment before comparing. Conditional update serializes concurrent guesses
    // and every entry point uses the same persistent attempt allowance.
    const claim = await tx.applicationChallenge.updateMany({
      where: { email, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (claim.count !== 1) return false;
    const record = await tx.applicationChallenge.findUniqueOrThrow({ where: { email } });
    const expected = Buffer.from(record.codeHash, "hex");
    const actual = Buffer.from(hashApplicationCode(email, code), "hex");
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (valid && consume) await tx.applicationChallenge.delete({ where: { email } });
    return valid;
  });
}
