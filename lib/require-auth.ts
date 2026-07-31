"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const verifiedUsers = new Map<string, number>();
const TTL_MS = 60_000;

async function userStillExists(userId: string): Promise<boolean> {
  const lastVerified = verifiedUsers.get(userId);
  if (lastVerified !== undefined && Date.now() - lastVerified < TTL_MS) {
    return true;
  }

  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    verifiedUsers.delete(userId);
    return false;
  }

  verifiedUsers.set(userId, Date.now());
  return true;
}

export async function requireAuth() {
  const session = await auth();

  if (session && !session.user) {
    console.error(
      "[requireAuth] auth() returned a session-shaped object with no `.user` — " +
      "this usually means AUTH_SECRET is missing or invalid, not that the user is logged out.",
      session
    );
  }

  if (!session?.user?.id) return null;

  const userId = session.user.id as string;
  const exists = await userStillExists(userId);
  if (!exists) {
    console.error(`[requireAuth] session userId ${userId} has no matching User row — stale/invalid session. User must log out and back in.`);
    return null;
  }

  return userId;
}

export async function requireOrg(): Promise<{ userId: string; organizationId: string; role: string } | null> {
  const userId = await requireAuth();
  if (!userId) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { organizationId: true, role: true },
  });

  if (!membership) {
    console.error(`[requireOrg] user ${userId} has no Organization membership — should be impossible after signup backfill.`);
    return null;
  }

  return { userId, organizationId: membership.organizationId, role: membership.role };
}