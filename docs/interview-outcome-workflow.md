# Interview outcome workflow

Interviewers assess; recruiters decide. A **Failed** scorecard never rejects a candidate by itself.

## Roles

| Role | Can do | Cannot do |
| --- | --- | --- |
| Interviewer | Submit one Pass/Fail scorecard (rating + feedback) for an interview assigned to them | Move, reject or archive a card, schedule, cancel, decide a failed round |
| Recruiter / Admin / Owner | Everything above, plus decide failed rounds and route cards between stages | — |

## State

Two columns on `Interview` (strings + CHECK constraints, like the rest of the schema):

| `result` (interviewer, immutable) | `reviewStatus` (recruiter gate) | Derived `InterviewStatus` |
| --- | --- | --- |
| `null` | `null` | `SCHEDULED` / `AWAITING_SCORECARD` |
| `PASSED` | `null` | `PASSED` |
| `FAILED` | `PENDING_REVIEW` | `FAILED_AWAITING_DECISION` |
| `FAILED` | `REJECTION_CONFIRMED` | `FAILED_REJECTED` |
| `FAILED` | `OVERRIDDEN` | `FAILED_OVERRIDDEN` |
| `FAILED` | `null` | `FAILED` (legacy row, or the application was already closed) |

`JobApplication.stage` is the application status. A failed scorecard leaves it alone; only a recruiter decision (or a manual move) changes it.

```
scorecard FAILED ──▶ PENDING_REVIEW ──confirm──▶ REJECTION_CONFIRMED   stage → REJECTED, candidate emailed once,
                                    │                                   other upcoming rounds cancelled
                                    └─override─▶ OVERRIDDEN             stage untouched, nobody emailed
```

Anything that routes the card by hand also settles an open decision: moving it to `REJECTED` confirms, any other move
(or booking a re-interview) overrides. See `lib/interview-outcome.ts` for the pure rules.

## Server actions

| Action | Who | Effect |
| --- | --- | --- |
| `submitInterviewFeedbackAction` | Assigned interviewer, or a pipeline editor on their behalf | Stores the scorecard once (compare-and-set). Fail requires feedback and opens `PENDING_REVIEW`, resolves the assigned recruiter and queues the alert. |
| `reviewFailedInterviewAction` | Owner / Admin / Recruiter | `CONFIRM_REJECTION` or `OVERRIDE`, with an optional note. Atomic: two people cannot both decide. |
| `updateApplicationStatusAction` | Owner / Admin / Recruiter | Unchanged, plus it settles an open decision on that application. |
| `scheduleInterviewAction` | Owner / Admin / Recruiter | Records `scheduledById` (the assigned recruiter); a re-interview settles an open decision as an override. |

Lock order across these flows is Organization → JobApplication → Interview.

## Assigned recruiter

`Interview.scheduledById` if that person still has a pipeline-editing role in the workspace, otherwise the workspace owner.
The choice is stored in `reviewAssigneeId`. If that person later loses access, the owner sees the alert instead.

## Notifications

| Event | Recipient | Channel | Dedupe key |
| --- | --- | --- | --- |
| Failed scorecard | Assigned recruiter (not sent if they entered it themselves) | Email + bell (until decided) + "decision needed" chip on the kanban card | `interview-failed:{interviewId}` |
| Rejection confirmed | Candidate | Email (the existing `REJECTED` status template; interviewer feedback is never included) | `interview-rejection:{interviewId}` |
| Override, Pass | — | — | — |

Upcoming rounds cancelled by a confirmed rejection do not send a separate cancellation email; the rejection email covers it.
The reminder cron skips applications that are already `REJECTED` or `HIRED`.

## Rollout

`20260921000000_interview_outcome_review` is additive. Existing failed interviews keep `reviewStatus = NULL`, so nothing
alerts retroactively.
