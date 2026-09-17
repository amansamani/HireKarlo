import { createHash } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Atomic shared counters, so cold starts and multiple application instances
// do not reset the protection. Keys are hashed to keep emails/IPs out of storage.
export async function allowRequest(key: string, max: number, windowMs: number): Promise<boolean> {
  const bucket = Math.floor(Date.now() / windowMs);
  const digest = createHash("sha256").update(`${key}:${bucket}`).digest("hex");
  const counter = await prisma.rateLimit.upsert({
    where: { key: digest },
    create: { key: digest, count: 1, expiresAt: new Date((bucket + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  return counter.count <= max;
}

export async function allowAuthRequest(action: string, email: string, max = 10) {
  const requestHeaders = await headers();
  // Use only a proxy header your deployment overwrites. See deployment guide.
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipAllowed = await allowRequest(`auth:${action}:ip:${ip}`, max * 5, 600_000);
  const emailAllowed = await allowRequest(`auth:${action}:email:${email.toLowerCase().trim()}`, max, 600_000);
  return ipAllowed && emailAllowed;
}
