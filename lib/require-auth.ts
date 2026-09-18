import { logError } from "@/lib/logger";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function requireAuth() {
  const session = await auth();

  if (session && !session.user) {
    logError("lib.require-auth");
  }

  if (!session?.user?.id) return null;

  const userId = session.user.id as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
  if (!user || user.sessionVersion !== (session.user as { sessionVersion?: number }).sessionVersion) {
    logError("lib.require-auth");
    return null;
  }

  return userId;
}

export async function requireOrg(): Promise<{ userId: string; organizationId: string; role: string } | null> {
  const userId = await requireAuth();
  if (!userId) return null;

  const organizationId = (await cookies()).get("hirekarlo-organization")?.value;
  let membership = await prisma.membership.findFirst({
    where: { userId, ...(organizationId ? { organizationId } : {}) },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });

  // A stale selection must never strand a valid user after removal from a
  // workspace or signing into another account. The fallback is still scoped
  // to this user's persisted memberships; the cookie grants no authority.
  if (!membership && organizationId) {
    membership = await prisma.membership.findFirst({
      where: { userId }, orderBy: { createdAt: "asc" },
      select: { organizationId: true, role: true },
    });
  }

  if (!membership) {
    logError("lib.require-auth");
    return null;
  }

  return { userId, organizationId: membership.organizationId, role: membership.role };
}
