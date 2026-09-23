import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { assertAuditDatabase } from "../helpers/audit-db";

const state = vi.hoisted(() => ({ ctx: { userId: "", organizationId: "", role: "OWNER" } }));
vi.mock("@/lib/require-auth", () => ({ requireOrg: async () => state.ctx, requireAuth: async () => state.ctx.userId }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }), cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/send-email", async original => ({ ...await original<typeof import("@/lib/send-email")>(), dispatchQueuedEmail: vi.fn() }));
vi.mock("@/lib/ai-scoring-jobs", () => ({ queueAiScore: vi.fn(), dispatchAiScore: vi.fn() }));
vi.mock("@/lib/google-calendar", () => ({ createMeetEvent: vi.fn(), deleteMeetEvent: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { submitInterviewFeedbackAction, reviewFailedInterviewAction, scheduleInterviewAction } from "@/actions/interview";
import { updateApplicationStatusAction, getJobApplicantsAction } from "@/actions/application";
import { getNotificationsAction } from "@/actions/analytics";
import { getAllInterviewsAction } from "@/actions/interviews-pool";
import { GET as interviewReminders } from "@/app/api/cron/interview-reminders/route";

describe("interview outcome workflow on isolated PostgreSQL", () => {
  const prefix = `outcome-${randomUUID()}`;
  const ids = {} as Record<"owner" | "recruiter" | "otherRecruiter" | "interviewer" | "org" | "job", string>;
  const day = 86_400_000;
  let seq = 0;

  const as = (userId: string, role: string) => { state.ctx = { userId, organizationId: ids.org, role }; };
  const asInterviewer = () => as(ids.interviewer, "INTERVIEWER");
  const asRecruiter = () => as(ids.recruiter, "RECRUITER");
  const asOwner = () => as(ids.owner, "OWNER");

  async function mail(dedupeKey: string) { return prisma.emailOutbox.findUnique({ where: { dedupeKey } }); }
  async function candidateMails(email: string) { return prisma.emailOutbox.findMany({ where: { recipient: email } }); }

  /** A candidate whose application sits in `stage`, with one scheduled interview for the interviewer. */
  async function scenario(opts: { stage?: string; scheduledById?: string | null; scheduledAt?: Date } = {}) {
    const n = ++seq, email = `${prefix}-cand${n}@example.test`;
    const candidate = await prisma.candidate.create({ data: { fullName: `Candidate ${n}`, email, experience: 1, skills: [], organizationId: ids.org, recruiterId: ids.owner } });
    const application = await prisma.jobApplication.create({ data: { candidateId: candidate.id, jobId: ids.job, stage: opts.stage ?? "Technical" } });
    const interview = await prisma.interview.create({ data: {
      applicationId: application.id, round: "Technical", interviewer: "Iris Interviewer", interviewerId: ids.interviewer,
      scheduledById: opts.scheduledById === undefined ? ids.recruiter : opts.scheduledById,
      scheduledAt: opts.scheduledAt ?? new Date(Date.now() - 3_600_000),
    } });
    return { email, applicationId: application.id, interviewId: interview.id };
  }
  const stageOf = async (applicationId: string) => (await prisma.jobApplication.findUniqueOrThrow({ where: { id: applicationId } })).stage;
  const reload = (interviewId: string) => prisma.interview.findUniqueOrThrow({ where: { id: interviewId } });

  beforeAll(async () => {
    assertAuditDatabase();
    const mk = (label: string) => prisma.user.create({ data: { email: `${prefix}-${label}@example.test`, name: `${label}`, password: "x", emailVerified: new Date() } });
    const [owner, recruiter, otherRecruiter, interviewer] = await Promise.all([mk("owner"), mk("recruiter"), mk("other"), mk("interviewer")]);
    const org = await prisma.organization.create({ data: { name: prefix, ownerId: owner.id } });
    await prisma.membership.createMany({ data: [
      { organizationId: org.id, userId: owner.id, role: "OWNER" }, { organizationId: org.id, userId: recruiter.id, role: "RECRUITER" },
      { organizationId: org.id, userId: otherRecruiter.id, role: "RECRUITER" }, { organizationId: org.id, userId: interviewer.id, role: "INTERVIEWER" },
    ] });
    const job = await prisma.job.create({ data: { title: "Outcome role", department: "Eng", location: "Remote", type: "Full-time", description: "Fixture", organizationId: org.id, userId: owner.id, interviewRounds: ["Technical", "Final"] } });
    Object.assign(ids, { owner: owner.id, recruiter: recruiter.id, otherRecruiter: otherRecruiter.id, interviewer: interviewer.id, org: org.id, job: job.id });
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { startsWith: prefix } }, select: { id: true } }), userIds = users.map(u => u.id);
    await prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.interview.deleteMany({ where: { application: { job: { organizationId: ids.org } } } });
    await prisma.organization.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.emailOutbox.deleteMany({ where: { OR: [{ recipient: { contains: prefix } }, { dedupeKey: { contains: "interview-" } , recipient: { contains: prefix } }] } });
    await prisma.$disconnect();
  });
  beforeEach(asInterviewer);

  it("a FAILED scorecard is logged and alerts the assigned recruiter, but never touches the candidate or the pipeline", async () => {
    const s = await scenario();
    const res = await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "Could not explain <b>closures</b>" });
    expect(res.error).toBeUndefined(); expect(res.reviewStatus).toBe("PENDING_REVIEW");

    const iv = await reload(s.interviewId);
    expect(iv).toMatchObject({ result: "FAILED", rating: 2, reviewStatus: "PENDING_REVIEW", reviewAssigneeId: ids.recruiter });
    expect(iv.scorecardSubmittedAt).not.toBeNull();
    expect(await stageOf(s.applicationId)).toBe("Technical");           // pipeline untouched
    expect(await candidateMails(s.email)).toHaveLength(0);              // candidate told nothing

    const alert = await mail(`interview-failed:${s.interviewId}`);
    expect(alert).toMatchObject({ recipient: `${prefix}-recruiter@example.test` });
    expect(alert!.subject).toContain("did not pass Technical");
    expect(alert!.html).toContain("&lt;b&gt;closures&lt;/b&gt;");
    expect(alert!.html).toContain("/dashboard/interviews");
    expect(await prisma.activityLog.count({ where: { applicationId: s.applicationId, action: "Awaiting Recruiter Decision" } })).toBe(1);
  });

  it("a PASSED scorecard opens no decision and sends nothing", async () => {
    const s = await scenario();
    expect((await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "PASSED", rating: 5, feedback: "" })).reviewStatus).toBeNull();
    expect(await reload(s.interviewId)).toMatchObject({ result: "PASSED", reviewStatus: null, reviewAssigneeId: null });
    expect(await mail(`interview-failed:${s.interviewId}`)).toBeNull();
  });

  it("requires written feedback to fail someone, and the scorecard is immutable once submitted", async () => {
    const s = await scenario();
    expect((await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 1, feedback: "  " })).error).toContain("feedback");
    expect((await reload(s.interviewId)).result).toBeNull();

    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "PASSED", rating: 4, feedback: "Good" });
    expect((await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 1, feedback: "Changed my mind" })).error).toContain("already submitted");
    expect(await reload(s.interviewId)).toMatchObject({ result: "PASSED", reviewStatus: null });

    // Racing double-submit alerts the recruiter once.
    const t = await scenario();
    const results = await Promise.all([1, 2].map(() => submitInterviewFeedbackAction({ interviewId: t.interviewId, result: "FAILED", rating: 2, feedback: "No" })));
    expect(results.filter(r => !r.error)).toHaveLength(1);
    expect(await prisma.emailOutbox.count({ where: { dedupeKey: `interview-failed:${t.interviewId}` } })).toBe(1);
  });

  it("interviewers cannot decide, move, schedule or read the recruiter's note", async () => {
    const s = await scenario();
    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    expect((await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "CONFIRM_REJECTION" })).error).toContain("Only recruiters");
    expect((await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "OVERRIDE" })).error).toContain("Only recruiters");
    expect((await updateApplicationStatusAction(s.applicationId, "REJECTED", ids.job)).error).toContain("Interviewers can't move");
    expect((await updateApplicationStatusAction(s.applicationId, "APPLIED", ids.job)).error).toBeTruthy();
    expect((await getJobApplicantsAction(ids.job)).error).toBeTruthy();
    expect(await stageOf(s.applicationId)).toBe("Technical");
    expect((await reload(s.interviewId)).reviewStatus).toBe("PENDING_REVIEW");

    asRecruiter(); await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "OVERRIDE", note: "Keep private" });
    asInterviewer();
    const seen = (await getAllInterviewsAction()).interviews.find(i => i.id === s.interviewId)!;
    expect(seen.reviewStatus).toBe("OVERRIDDEN"); expect(seen.reviewNote).toBeNull();
  });

  it("alerts the workspace owner when there is no assigned recruiter, or they lost pipeline access", async () => {
    const legacy = await scenario({ scheduledById: null });
    await submitInterviewFeedbackAction({ interviewId: legacy.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    expect(await reload(legacy.interviewId)).toMatchObject({ reviewAssigneeId: ids.owner });
    expect((await mail(`interview-failed:${legacy.interviewId}`))!.recipient).toBe(`${prefix}-owner@example.test`);

    // Scheduled by someone who is only an interviewer now → also falls back to the owner.
    const demoted = await scenario({ scheduledById: ids.interviewer });
    await submitInterviewFeedbackAction({ interviewId: demoted.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    expect((await reload(demoted.interviewId)).reviewAssigneeId).toBe(ids.owner);
  });

  it("does not email a recruiter about a scorecard they entered themselves, but still opens the decision", async () => {
    const s = await scenario(); asRecruiter();
    const res = await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "Recorded for the panel" });
    expect(res.reviewStatus).toBe("PENDING_REVIEW");
    expect(await mail(`interview-failed:${s.interviewId}`)).toBeNull();
  });

  it("puts the decision in the assignee's in-app feed (owner only as fallback) and flags the kanban card", async () => {
    const s = await scenario();
    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    const titles = async () => ((await getNotificationsAction()).notifications as { id: string; type: string }[]).filter(n => n.type === "interview_review").map(n => n.id);

    asRecruiter(); expect(await titles()).toContain(`review-${s.interviewId}`);
    as(ids.otherRecruiter, "RECRUITER"); expect(await titles()).not.toContain(`review-${s.interviewId}`);
    asOwner(); expect(await titles()).not.toContain(`review-${s.interviewId}`);

    await prisma.membership.deleteMany({ where: { userId: ids.recruiter, organizationId: ids.org } });
    try { asOwner(); expect(await titles()).toContain(`review-${s.interviewId}`); }
    finally { await prisma.membership.create({ data: { organizationId: ids.org, userId: ids.recruiter, role: "RECRUITER" } }); }

    asRecruiter();
    expect((await getJobApplicantsAction(ids.job)).applications.find(a => a.id === s.applicationId)).toMatchObject({ pendingReview: true });
  });

  it("confirming rejects the card, emails the candidate once, and cancels upcoming rounds", async () => {
    const s = await scenario();
    const upcoming = await prisma.interview.create({ data: { applicationId: s.applicationId, round: "Final", interviewer: "Iris", interviewerId: ids.interviewer, scheduledAt: new Date(Date.now() + 2 * day) } });
    await prisma.emailOutbox.create({ data: { dedupeKey: `interview-scheduled:${upcoming.id}`, recipient: s.email, subject: "Interview scheduled", html: "x" } });
    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    expect(await candidateMails(s.email)).toHaveLength(1);              // only the scheduling mail so far

    asRecruiter();
    const res = await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "CONFIRM_REJECTION", note: "Not a fit" });
    expect(res.error).toBeUndefined();
    expect(await stageOf(s.applicationId)).toBe("REJECTED");
    expect(await reload(s.interviewId)).toMatchObject({ reviewStatus: "REJECTION_CONFIRMED", reviewedById: ids.recruiter, reviewNote: "Not a fit" });
    expect((await reload(s.interviewId)).reviewedAt).not.toBeNull();

    const rejection = await mail(`interview-rejection:${s.interviewId}`);
    expect(rejection).toMatchObject({ recipient: s.email });
    expect(rejection!.subject).toContain("An update on your application");
    expect(rejection!.html).not.toContain("closures");                  // interviewer feedback never reaches the candidate
    expect(await prisma.interview.findUnique({ where: { id: upcoming.id } })).toBeNull();
    expect((await mail(`interview-scheduled:${upcoming.id}`))!.failedAt).not.toBeNull();
    expect(await prisma.auditEvent.count({ where: { organizationId: ids.org, action: "INTERVIEW_REJECTION_CONFIRMED", targetId: s.interviewId } })).toBe(1);

    // Deciding twice is refused and never emails again.
    expect((await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "CONFIRM_REJECTION" })).error).toContain("already decided");
    expect((await candidateMails(s.email)).filter(m => m.dedupeKey?.startsWith("interview-rejection:"))).toHaveLength(1);
  });

  it("concurrent recruiters cannot both decide the same failed interview", async () => {
    const s = await scenario(); await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    asRecruiter();
    const results = await Promise.all([
      reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "CONFIRM_REJECTION" }),
      reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "OVERRIDE" }),
    ]);
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect((await reload(s.interviewId)).reviewStatus).toMatch(/^(REJECTION_CONFIRMED|OVERRIDDEN)$/);
  });

  it("overriding keeps the candidate where they are, sends nothing, and leaves routing to the recruiter", async () => {
    const s = await scenario();
    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "Borderline" });
    asRecruiter();
    expect((await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "OVERRIDE", note: "Try another team" })).success).toBeTruthy();
    expect(await reload(s.interviewId)).toMatchObject({ reviewStatus: "OVERRIDDEN", reviewNote: "Try another team" });
    expect(await stageOf(s.applicationId)).toBe("Technical");
    expect(await candidateMails(s.email)).toHaveLength(0);
    expect((await updateApplicationStatusAction(s.applicationId, "OFFER", ids.job)).success).toBeTruthy();   // full manual control retained
    expect(await stageOf(s.applicationId)).toBe("OFFER");
  });

  it("moving the card by hand settles the open decision: REJECTED confirms, anything else overrides", async () => {
    const a = await scenario(), b = await scenario();
    for (const s of [a, b]) await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    asRecruiter();
    await updateApplicationStatusAction(a.applicationId, "REJECTED", ids.job);
    await updateApplicationStatusAction(b.applicationId, "OFFER", ids.job);
    expect((await reload(a.interviewId)).reviewStatus).toBe("REJECTION_CONFIRMED");
    expect((await reload(b.interviewId)).reviewStatus).toBe("OVERRIDDEN");
    expect(await mail(`interview-rejection:${a.interviewId}`)).toBeNull();                  // the normal stage email already told them
    expect((await candidateMails(a.email)).length).toBe(1);
  });

  it("booking a re-interview overrides the failed result", async () => {
    const s = await scenario();
    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "Retry with another panel" });
    asRecruiter();
    const res = await scheduleInterviewAction({ applicationId: s.applicationId, jobId: ids.job, round: "Final", targetStage: "Final", interviewer: "Iris Interviewer", interviewerId: ids.interviewer, scheduledAt: new Date(Date.now() + 5 * day).toISOString(), timezone: "UTC" });
    expect(res.error).toBeUndefined();
    expect(await reload(s.interviewId)).toMatchObject({ reviewStatus: "OVERRIDDEN", reviewNote: "Re-interview scheduled", reviewedById: ids.recruiter });
    expect((await prisma.interview.findFirstOrThrow({ where: { applicationId: s.applicationId, round: "Final" } })).scheduledById).toBe(ids.recruiter);
  });

  it("a failed round on an application that is already closed needs no decision", async () => {
    for (const stage of ["REJECTED", "HIRED"]) {
      const s = await scenario({ stage });
      expect((await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" })).reviewStatus).toBeNull();
      expect(await reload(s.interviewId)).toMatchObject({ result: "FAILED", reviewStatus: null, reviewAssigneeId: null });
      expect(await mail(`interview-failed:${s.interviewId}`)).toBeNull();
    }
  });

  it("refuses to reject someone who was hired in the meantime", async () => {
    const s = await scenario();
    await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    await prisma.jobApplication.update({ where: { id: s.applicationId }, data: { stage: "HIRED" } });   // bypasses the action on purpose
    asRecruiter();
    expect((await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "CONFIRM_REJECTION" })).error).toContain("already hired");
    expect(await stageOf(s.applicationId)).toBe("HIRED");
    expect((await reload(s.interviewId)).reviewStatus).toBe("PENDING_REVIEW");        // claim rolled back
  });

  it("cannot decide across workspaces", async () => {
    const s = await scenario(); await submitInterviewFeedbackAction({ interviewId: s.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    state.ctx = { userId: ids.recruiter, organizationId: "another-workspace", role: "RECRUITER" };
    expect((await reviewFailedInterviewAction({ interviewId: s.interviewId, decision: "CONFIRM_REJECTION" })).error).toContain("not found");
    expect(await stageOf(s.applicationId)).toBe("Technical");
  });

  it("does not remind a rejected candidate about an interview", async () => {
    const soon = new Date(Date.now() + 3_600_000 * 5);
    const open = await scenario({ scheduledAt: soon }), closed = await scenario({ stage: "REJECTED", scheduledAt: soon });
    process.env.CRON_SECRET = "cron-secret-for-tests";
    const res = await interviewReminders(new NextRequest("http://localhost/api/cron/interview-reminders", { headers: { authorization: "Bearer cron-secret-for-tests" } }));
    expect((await res.json()).sent).toBeGreaterThanOrEqual(1);
    expect(await mail(`interview-reminder:${open.interviewId}`)).not.toBeNull();
    expect(await mail(`interview-reminder:${closed.interviewId}`)).toBeNull();
  });

  it("the database itself rejects impossible states", async () => {
    const passed = await scenario();
    await submitInterviewFeedbackAction({ interviewId: passed.interviewId, result: "PASSED", rating: 4, feedback: "" });
    await expect(prisma.interview.update({ where: { id: passed.interviewId }, data: { reviewStatus: "PENDING_REVIEW" } })).rejects.toThrow();        // gate needs FAILED
    const open = await scenario();
    await expect(prisma.interview.update({ where: { id: open.interviewId }, data: { result: "MAYBE" } })).rejects.toThrow();                          // unknown result
    await submitInterviewFeedbackAction({ interviewId: open.interviewId, result: "FAILED", rating: 2, feedback: "No" });
    await expect(prisma.interview.update({ where: { id: open.interviewId }, data: { reviewStatus: "APPROVED" } })).rejects.toThrow();               // unknown status
    await expect(prisma.interview.update({ where: { id: open.interviewId }, data: { reviewStatus: "OVERRIDDEN" } })).rejects.toThrow();              // decision must record who/when
  });
});
