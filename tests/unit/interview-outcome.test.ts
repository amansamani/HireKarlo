import { describe, expect, it } from "vitest";
import {
  deriveInterviewStatus, planReviewDecision, reviewStatusAfterManualMove, reviewStatusAfterScorecard,
} from "@/lib/interview-outcome";
import { PIPELINE_EDITOR_ROLES, canEditPipeline } from "@/lib/roles";
import { interviewFailedRecruiterEmail } from "@/lib/email-templates";

describe("interview outcome state machine", () => {
  it("opens a recruiter decision only for a FAILED scorecard on an open application", () => {
    expect(reviewStatusAfterScorecard("FAILED", "Technical")).toBe("PENDING_REVIEW");
    expect(reviewStatusAfterScorecard("FAILED", "APPLIED")).toBe("PENDING_REVIEW");
    expect(reviewStatusAfterScorecard("PASSED", "Technical")).toBeNull();
    expect(reviewStatusAfterScorecard("FAILED", "REJECTED")).toBeNull();
    expect(reviewStatusAfterScorecard("FAILED", "HIRED")).toBeNull();
  });

  it("treats a manual card move as the recruiter's decision", () => {
    expect(reviewStatusAfterManualMove("REJECTED")).toBe("REJECTION_CONFIRMED");
    expect(reviewStatusAfterManualMove("OFFER")).toBe("OVERRIDDEN");
    expect(reviewStatusAfterManualMove("Technical")).toBe("OVERRIDDEN");
  });

  it("plans a confirmation: reject and notify exactly once", () => {
    expect(planReviewDecision("CONFIRM_REJECTION", "Technical")).toEqual({ ok: true, moveToRejected: true, notifyCandidate: true, nextReviewStatus: "REJECTION_CONFIRMED" });
    // Already rejected by hand: settle the gate without a second email.
    expect(planReviewDecision("CONFIRM_REJECTION", "REJECTED")).toEqual({ ok: true, moveToRejected: false, notifyCandidate: false, nextReviewStatus: "REJECTION_CONFIRMED" });
    expect(planReviewDecision("CONFIRM_REJECTION", "HIRED")).toEqual({ ok: false, reason: "ALREADY_HIRED" });
  });

  it("plans an override: no stage change and no candidate email", () => {
    for (const stage of ["Technical", "OFFER", "HIRED", "REJECTED"]) {
      expect(planReviewDecision("OVERRIDE", stage)).toEqual({ ok: true, moveToRejected: false, notifyCandidate: false, nextReviewStatus: "OVERRIDDEN" });
    }
  });

  it("derives one human-facing interview status from the two columns", () => {
    const now = new Date("2026-09-21T10:00:00Z");
    const future = "2026-09-22T10:00:00Z", past = "2026-09-20T10:00:00Z";
    expect(deriveInterviewStatus({ scheduledAt: future, result: null, reviewStatus: null }, now)).toBe("SCHEDULED");
    expect(deriveInterviewStatus({ scheduledAt: past, result: null, reviewStatus: null }, now)).toBe("AWAITING_SCORECARD");
    expect(deriveInterviewStatus({ scheduledAt: past, result: "PASSED", reviewStatus: null }, now)).toBe("PASSED");
    expect(deriveInterviewStatus({ scheduledAt: past, result: "FAILED", reviewStatus: "PENDING_REVIEW" }, now)).toBe("FAILED_AWAITING_DECISION");
    expect(deriveInterviewStatus({ scheduledAt: past, result: "FAILED", reviewStatus: "REJECTION_CONFIRMED" }, now)).toBe("FAILED_REJECTED");
    expect(deriveInterviewStatus({ scheduledAt: past, result: "FAILED", reviewStatus: "OVERRIDDEN" }, now)).toBe("FAILED_OVERRIDDEN");
    expect(deriveInterviewStatus({ scheduledAt: past, result: "FAILED", reviewStatus: null }, now)).toBe("FAILED");
  });

  it("never lets interviewers hold pipeline authority", () => {
    expect(PIPELINE_EDITOR_ROLES).toEqual(["OWNER", "ADMIN", "RECRUITER"]);
    expect(canEditPipeline("INTERVIEWER")).toBe(false);
    for (const role of PIPELINE_EDITOR_ROLES) expect(canEditPipeline(role)).toBe(true);
  });
});

describe("recruiter alert email", () => {
  const base = { recruiterName: "Riya", candidateName: "Ann <b>Lee</b>", jobTitle: "Engineer", round: "Technical", interviewerName: "Ivan", rating: 2, feedback: "Weak <script>alert(1)</script>", reviewUrl: "https://app.test/dashboard/interviews" };

  it("escapes every interpolated value and links to the decision page", () => {
    const { subject, html } = interviewFailedRecruiterEmail(base);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Lee</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("https://app.test/dashboard/interviews");
    expect(subject).toContain("did not pass Technical");
  });

  it("states plainly that the candidate has not been told", () => {
    expect(interviewFailedRecruiterEmail(base).html).toContain("has <strong>not</strong> been told");
  });

  it("clamps the displayed rating and falls back when there is no feedback or name", () => {
    const { html } = interviewFailedRecruiterEmail({ ...base, recruiterName: null, feedback: "", rating: 99 });
    expect(html).toContain("Hi there,");
    expect(html).toContain("5/5");
    expect(html).toContain("No written feedback provided.");
  });
});
