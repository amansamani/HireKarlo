"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    console.error(`[requireAuth] session userId ${userId} has no matching User row — stale/invalid session. User must log out and back in.`);
    return null;
  }

  return userId;
}