import type { Prisma } from "@prisma/client";
import { PIPELINE_EDITOR_ROLES } from "@/lib/roles";
import { TERMINAL_STAGES } from "@/lib/pipeline";

/**
 * Interview outcome workflow.
 *
 * Two independent state machines live on `Interview`:
 *
 *  1. Scorecard  (`result`, written by the interviewer, immutable once set)
 *       null ──submit──▶ PASSED
 *       null ──submit──▶ FAILED
 *
 *  2. Recruiter decision gate (`reviewStatus`, only exists for FAILED)
 *       (none) ──FAILED submitted, application not terminal──▶ PENDING_REVIEW
 *       PENDING_REVIEW ──recruiter confirms──▶ REJECTION_CONFIRMED   (application → REJECTED, candidate emailed)
 *       PENDING_REVIEW ──recruiter overrides──▶ OVERRIDDEN           (application untouched)
 *       PENDING_REVIEW ──card moved manually / re-interview booked──▶ REJECTION_CONFIRMED | OVERRIDDEN
 *
 * The interviewer never changes `JobApplication.stage`. Only OWNER / ADMIN / RECRUITER can.
 */

export const SCORECARD_RESULTS = ["PASSED", "FAILED"] as const;
export type ScorecardResult = (typeof SCORECARD_RESULTS)[number];

export const REVIEW_STATUSES = ["PENDING_REVIEW", "REJECTION_CONFIRMED", "OVERRIDDEN"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewDecision = "CONFIRM_REJECTION" | "OVERRIDE";

/** Human-facing lifecycle of one interview, derived from the two columns above. */
export type InterviewStatus =
  | "SCHEDULED"
  | "AWAITING_SCORECARD"
  | "PASSED"
  | "FAILED_AWAITING_DECISION"
  | "FAILED_REJECTED"
  | "FAILED_OVERRIDDEN"
  | "FAILED";

export function deriveInterviewStatus(
  interview: { scheduledAt: Date | string; result: string | null; reviewStatus: string | null },
  now: Date = new Date(),
): InterviewStatus {
  if (interview.result === "PASSED") return "PASSED";
  if (interview.result === "FAILED") {
    if (interview.reviewStatus === "PENDING_REVIEW") return "FAILED_AWAITING_DECISION";
    if (interview.reviewStatus === "REJECTION_CONFIRMED") return "FAILED_REJECTED";
    if (interview.reviewStatus === "OVERRIDDEN") return "FAILED_OVERRIDDEN";
    return "FAILED"; // legacy row, or the application was already terminal
  }
  return new Date(interview.scheduledAt).getTime() > now.getTime() ? "SCHEDULED" : "AWAITING_SCORECARD";
}

export function isTerminalStage(stage: string): boolean {
  return (TERMINAL_STAGES as readonly string[]).includes(stage);
}

/** A FAILED scorecard only needs a decision while the application is still open. */
export function reviewStatusAfterScorecard(result: ScorecardResult, applicationStage: string): ReviewStatus | null {
  return result === "FAILED" && !isTerminalStage(applicationStage) ? "PENDING_REVIEW" : null;
}

/** What a manual kanban move / re-interview means for a review that is still open. */
export function reviewStatusAfterManualMove(newStage: string): Exclude<ReviewStatus, "PENDING_REVIEW"> {
  return newStage === "REJECTED" ? "REJECTION_CONFIRMED" : "OVERRIDDEN";
}

export type DecisionPlan =
  | { ok: true; moveToRejected: boolean; notifyCandidate: boolean; nextReviewStatus: Exclude<ReviewStatus, "PENDING_REVIEW"> }
  | { ok: false; reason: "ALREADY_HIRED" };

/** Pure planner for the recruiter's decision, so the rules are testable without a database. */
export function planReviewDecision(decision: ReviewDecision, applicationStage: string): DecisionPlan {
  if (decision === "OVERRIDE") return { ok: true, moveToRejected: false, notifyCandidate: false, nextReviewStatus: "OVERRIDDEN" };
  if (applicationStage === "HIRED") return { ok: false, reason: "ALREADY_HIRED" };
  // Someone may already have rejected the card by hand: settle the gate, but never email twice.
  const alreadyRejected = applicationStage === "REJECTED";
  return { ok: true, moveToRejected: !alreadyRejected, notifyCandidate: !alreadyRejected, nextReviewStatus: "REJECTION_CONFIRMED" };
}

type RecruiterLookup = Pick<Prisma.TransactionClient, "membership" | "organization">;
export type AssignedRecruiter = { id: string; email: string; name: string | null; source: "SCHEDULER" | "OWNER" };

/**
 * Who gets alerted: the recruiter who booked the interview, provided they still hold a
 * pipeline-editing role in this workspace; otherwise the workspace owner.
 */
export async function resolveAssignedRecruiter(
  tx: RecruiterLookup,
  organizationId: string,
  scheduledById: string | null,
): Promise<AssignedRecruiter> {
  if (scheduledById) {
    const membership = await tx.membership.findFirst({
      where: { organizationId, userId: scheduledById, role: { in: [...PIPELINE_EDITOR_ROLES] } },
      select: { user: { select: { id: true, email: true, name: true } } },
    });
    if (membership) return { ...membership.user, source: "SCHEDULER" };
  }
  const org = await tx.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { owner: { select: { id: true, email: true, name: true } } },
  });
  return { ...org.owner, source: "OWNER" };
}
