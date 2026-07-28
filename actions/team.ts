"use server";

import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canManageTeam } from "@/lib/roles";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/send-email";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "RECRUITER", "INTERVIEWER"]),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function getTeamAction() {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized", members: [], invites: [] };

  try {
    const [members, invites, org] = await Promise.all([
      prisma.membership.findMany({
        where: { organizationId: ctx.organizationId },
        select: { id: true, role: true, userId: true, user: { select: { name: true, email: true, bio: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.teamInvite.findMany({
        where: { organizationId: ctx.organizationId, expires: { gt: new Date() } },
        select: { id: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { googleCalendarEmail: true },
      }),
    ]);

    const ratingStats = await prisma.interview.groupBy({
      by: ["interviewerId"],
      where: { interviewerId: { in: members.map((m) => m.userId) }, interviewerRating: { not: null } },
      _avg: { interviewerRating: true },
      _count: { interviewerRating: true },
    });
    const statsByUserId = new Map(
      ratingStats.map((s) => [s.interviewerId, { avg: s._avg.interviewerRating ?? 0, count: s._count.interviewerRating }])
    );
    const membersWithStats = members.map((m) => ({
      ...m,
      interviewerStats: statsByUserId.get(m.userId) ?? null,
    }));
    return {
      members: membersWithStats,
      invites,
      currentUserId: ctx.userId,
      currentRole: ctx.role,
      googleCalendarEmail: org?.googleCalendarEmail ?? null,
    };
  } catch (error) {
    console.error("[getTeamAction] failed:", error);
    return { error: "Failed to load team.", members: [], invites: [] };
  }
}

export async function disconnectGoogleCalendarAction() {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canManageTeam(ctx.role)) return { error: "Only owners and admins can manage the calendar connection." };

  try {
    await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { googleRefreshToken: null, googleCalendarEmail: null },
    });
    revalidatePath("/dashboard/team");
    return { success: "Google Calendar disconnected." };
  } catch (error) {
    console.error("[disconnectGoogleCalendarAction] failed:", error);
    return { error: "Failed to disconnect." };
  }
}

export async function updateMyBioAction(bio: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };

  const trimmed = bio.trim().slice(0, 240);

  try {
    await prisma.user.update({ where: { id: ctx.userId }, data: { bio: trimmed || null } });
    revalidatePath("/dashboard/team");
    return { success: "Bio updated." };
  } catch (error) {
    console.error("[updateMyBioAction] failed:", error);
    return { error: "Failed to update bio." };
  }
}

export async function inviteTeamMemberAction(rawData: unknown) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canManageTeam(ctx.role)) return { error: "Only owners and admins can invite team members." };

  const parsed = InviteSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid invite." };

  try {
    const existingMember = await prisma.membership.findFirst({
      where: { organizationId: ctx.organizationId, user: { email: parsed.data.email } },
    });
    if (existingMember) return { error: "This person is already on your team." };

    const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { name: true } });
    const token = randomBytes(24).toString("hex");

    await prisma.teamInvite.upsert({
      where: { organizationId_email: { organizationId: ctx.organizationId, email: parsed.data.email } },
      create: {
        organizationId: ctx.organizationId,
        email: parsed.data.email,
        role: parsed.data.role,
        token,
        expires: new Date(Date.now() + INVITE_TTL_MS),
      },
      update: { role: parsed.data.role, token, expires: new Date(Date.now() + INVITE_TTL_MS) },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/accept-invite?token=${token}`;
    await sendEmail(
      parsed.data.email,
      `You've been invited to join ${org?.name ?? "a team"} on HireKarlo`,
      `<div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
        <h2>You're invited</h2>
        <p>You've been invited to join <strong>${org?.name}</strong> on HireKarlo as ${parsed.data.role.toLowerCase()}.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Accept invite</a></p>
        <p style="color:#a1a1aa;font-size:12px;">This link expires in 7 days.</p>
      </div>`
    );

    revalidatePath("/dashboard/team");
    return { success: "Invite sent." };
  } catch (error) {
    console.error("[inviteTeamMemberAction] failed:", error);
    return { error: "Failed to send invite." };
  }
}

export async function acceptInviteAction(token: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Please log in first, then open the invite link again." };

  try {
    const invite = await prisma.teamInvite.findUnique({ where: { token } });
    if (!invite || invite.expires < new Date()) {
      return { error: "This invite is invalid or has expired." };
    }

    const existingMembership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: ctx.userId } },
    });
    if (existingMembership) {
      await prisma.teamInvite.delete({ where: { token } });
      return { error: "You're already a member of this team." };
    }

    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: ctx.userId } },
      create: { organizationId: invite.organizationId, userId: ctx.userId, role: invite.role },
      update: { role: invite.role },
    });
    await prisma.teamInvite.delete({ where: { token } });

    return { success: "You've joined the team!" };
  } catch (error) {
    console.error("[acceptInviteAction] failed:", error);
    return { error: "Failed to accept invite." };
  }
}

export async function removeMemberAction(membershipId: string) {
  const ctx = await requireOrg();
  if (!ctx) return { error: "Unauthorized" };
  if (!canManageTeam(ctx.role)) return { error: "Only owners and admins can remove team members." };

  try {
    const target = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!target || target.organizationId !== ctx.organizationId) return { error: "Member not found." };
    if (target.role === "OWNER") return { error: "Can't remove the team owner." };

    await prisma.membership.delete({ where: { id: membershipId } });
    revalidatePath("/dashboard/team");
    return { success: "Member removed." };
  } catch (error) {
    console.error("[removeMemberAction] failed:", error);
    return { error: "Failed to remove member." };
  }
}