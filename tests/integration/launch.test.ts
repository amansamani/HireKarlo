import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { assertAuditDatabase } from "../helpers/audit-db";
const state = vi.hoisted(() => ({ ctx: { userId: "", organizationId: "", role: "OWNER" }, provider: vi.fn(), mail: vi.fn() }));
vi.mock("@/lib/require-auth", () => ({ requireOrg: async () => state.ctx, requireAuth: async () => state.ctx.userId }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: state.mail }) } }));
vi.mock("@/lib/billing-provider", async original => ({ ...await original<typeof import("@/lib/billing-provider")>(), stripeRequest: state.provider }));
vi.mock("@/lib/send-email", async original => ({ ...await original<typeof import("@/lib/send-email")>(), dispatchQueuedEmail: vi.fn() }));
vi.mock("@/lib/ai-scoring-jobs", () => ({ queueAiScore: vi.fn(), dispatchAiScore: vi.fn() }));
vi.mock("@/lib/google-calendar", () => ({ createMeetEvent: vi.fn(), deleteMeetEvent: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { prepareCheckout, openCheckout, abandonCheckout } from "@/lib/checkout";
import { deliverEmail, enqueueEmail } from "@/lib/send-email";
import { updateApplicationStatusAction } from "@/actions/application";
import { scheduleInterviewAction } from "@/actions/interview";
import { inviteTeamMemberAction, revokeInviteAction } from "@/actions/team";

describe("production workflow regressions on isolated PostgreSQL", () => {
  const prefix = `launch-${randomUUID()}`;
  let jobId: string, applicationId: string;
  beforeAll(async () => {
    assertAuditDatabase();
    process.env.NEXT_PUBLIC_APP_URL = "https://audit.example.test";
    process.env.STRIPE_PRICE_STARTER_INR = "price_test";
    process.env.EMAIL_USER = "audit@example.test"; process.env.EMAIL_PASS = "mock";
    const user = await prisma.user.create({ data: { email: `${prefix}@example.test`, password: "unused", emailVerified: new Date() } });
    const org = await prisma.organization.create({ data: { name: prefix, ownerId: user.id } });
    state.ctx = { userId: user.id, organizationId: org.id, role: "OWNER" };
    await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });
    const job = await prisma.job.create({ data: { title: prefix, department: "Test", location: "Remote", type: "Full-time", description: "Synthetic test role", userId: user.id, organizationId: org.id } }); jobId = job.id;
    const candidate = await prisma.candidate.create({ data: { email: `${prefix}-candidate@example.test`, fullName: "Synthetic candidate", experience: 0, skills: [], organizationId: org.id, recruiterId: user.id } });
    const app = await prisma.jobApplication.create({ data: { jobId, candidateId: candidate.id, stage: "OFFER" } }); applicationId = app.id;
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.activityLog.deleteMany({ where: { userId: state.ctx.userId } });
    await prisma.organization.delete({ where: { id: state.ctx.organizationId } });
    await prisma.user.delete({ where: { id: state.ctx.userId } });
    await prisma.emailOutbox.deleteMany({ where: { recipient: { contains: prefix } } });
    await prisma.auditEvent.deleteMany({ where: { organizationId: state.ctx.organizationId } });
    await prisma.$disconnect();
  });
  it("persists one stable checkout body/key across concurrent attempts and plan changes", async () => {
    const intents = await Promise.all(Array.from({ length: 4 }, () => prepareCheckout(state.ctx, "STARTER", "INR")));
    expect(new Set(intents.map(x => x.idempotencyKey)).size).toBe(1);
    expect(new Set(intents.map(x => x.requestBody)).size).toBe(1);
    await expect(prepareCheckout(state.ctx, "GROWTH", "USD")).rejects.toMatchObject({ code: "pending" });
  });
  it("replays the same Stripe request after remote success/local save failure", async () => {
    const calls: { body: string; key: string }[] = [];
    state.provider.mockImplementation(async (route: string, params?: URLSearchParams, key?: string) => {
      if (route.startsWith("prices/")) return { active: true, currency: "inr", unit_amount: 149900, recurring: { interval: "month", interval_count: 1 } };
      if (route === "checkout/sessions") calls.push({ body: params!.toString(), key: key! });
      return { id: "cs_audit_launch", status: "open", url: "https://checkout.stripe.com/test" };
    });
    const update = vi.spyOn(prisma.billingCheckout, "updateMany").mockRejectedValueOnce(new Error("simulated database interruption"));
    await expect(openCheckout(state.ctx, "STARTER", "INR")).rejects.toThrow("interruption");
    expect(await openCheckout(state.ctx, "STARTER", "INR")).toBe("https://checkout.stripe.com/test");
    expect(calls).toHaveLength(2); expect(calls[0]).toEqual(calls[1]); update.mockRestore();
  });
  it("does not discard completed checkout; expires an unpaid session before clearing it", async () => {
    state.provider.mockResolvedValue({ id: "cs_audit_launch", status: "complete" });
    await expect(abandonCheckout(state.ctx)).rejects.toMatchObject({ code: "review" });
    expect(await prisma.billingCheckout.count()).toBe(1);
    state.provider.mockResolvedValueOnce({ id: "cs_audit_launch", status: "open" }).mockResolvedValueOnce({ id: "cs_audit_launch", status: "expired" });
    await abandonCheckout(state.ctx);
    expect(await prisma.billingCheckout.findUnique({ where: { organizationId: state.ctx.organizationId } })).toBeNull();
  });
  it("does not deliver expired verification email", async () => {
    state.mail.mockClear();
    const id = await enqueueEmail(prisma, `${prefix}@example.test`, "Expired code", "Synthetic", undefined, undefined, new Date(Date.now() - 1000));
    expect(await deliverEmail(id)).toBe(false); expect(state.mail).not.toHaveBeenCalled();
    expect((await prisma.emailOutbox.findUniqueOrThrow({ where: { id } })).failedAt).not.toBeNull();
  });
  it("returns durable invitation identity and supports authorized revocation", async () => {
    const result = await inviteTeamMemberAction({ email: `${prefix}-invite@example.test`, role: "INTERVIEWER" });
    expect(result.invite?.id).toBeTruthy();
    const saved = await prisma.teamInvite.findUniqueOrThrow({ where: { id: result.invite!.id } });
    expect(saved.token).toMatch(/^sha256:/);
    const email = await prisma.emailOutbox.findFirstOrThrow({ where: { recipient: saved.email } });
    expect(email.expiresAt).toEqual(saved.expires);
    state.ctx.role = "INTERVIEWER";
    expect((await revokeInviteAction(saved.id)).error).toBeTruthy();
    expect(await prisma.teamInvite.findUnique({ where: { id: saved.id } })).not.toBeNull();
    state.ctx.role = "OWNER";
    expect((await revokeInviteAction(saved.id)).success).toBeTruthy();
    expect(await prisma.teamInvite.findUnique({ where: { id: saved.id } })).toBeNull();
    expect(await prisma.auditEvent.count({ where: { targetId: saved.id, action: "INVITE_REVOKED" } })).toBe(1);
  });
  it("commits a hire once and avoids duplicate notifications on repeated stage requests", async () => {
    expect((await updateApplicationStatusAction(applicationId, "HIRED", jobId)).success).toBeTruthy();
    expect((await updateApplicationStatusAction(applicationId, "HIRED", jobId)).success).toBeTruthy();
    expect(await prisma.activityLog.count({ where: { applicationId, action: "Moved to HIRED" } })).toBe(1);
  });
  it("blocks new hiring writes after expiry while retaining existing records", async () => {
    await prisma.organization.update({ where: { id: state.ctx.organizationId }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    expect((await updateApplicationStatusAction(applicationId, "APPLIED", jobId)).error).toBeTruthy();
    expect((await scheduleInterviewAction({ applicationId, jobId, round: "Interview", targetStage: "Interview", interviewer: "Test", scheduledAt: new Date(Date.now() + 86400000).toISOString() })).error).toBeTruthy();
    expect((await prisma.jobApplication.findUniqueOrThrow({ where: { id: applicationId } })).stage).toBe("HIRED");
  });
});
