"use client";

import { useCallback, useState } from "react";
import {
  Briefcase,
  Clock,
  UserCheck,
  Loader2,
  Star,
  Video,
  Trash2,
  X,
  CalendarClock,
  ClipboardCheck,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllInterviewsAction } from "@/actions/interviews-pool";
import {
  submitInterviewFeedbackAction,
  rateInterviewerAction,
  cancelInterviewAction,
} from "@/actions/interview";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type GlobalInterview = {
  id: string;
  round: string;
  interviewer: string;
  interviewerId: string | null;
  interviewerRating: number | null;
  meetingLink: string | null;
  scheduledAt: Date | string;
  result: string | null;
  rating: number | null;
  feedback: string | null;
  application: {
    job: { id: string; title: string };
    candidate: { fullName: string; email: string };
  };
};

function prettyResult(result: string | null) {
  if (result === "PASSED") return "Passed";
  if (result === "FAILED") return "Failed";
  if (result === "PENDING") return "Pending";
  return result ?? "—";
}

/* ───────────────────────── Scorecard ───────────────────────── */
function ScorecardForm({
  interview,
  onSaved,
}: {
  interview: GlobalInterview;
  onSaved: (id: string, result: string, rating: number, feedback: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // ✅ UPPERCASE — matches interview.ts: "PASSED" | "FAILED" | "PENDING"
  const [result, setResult] = useState<"PASSED" | "FAILED">("PASSED");
  const [rating, setRating] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  // Already submitted → read-only summary
  if (interview.result) {
    return (
      <div className="space-y-1.5 rounded-xl border border-success/20 bg-success/5 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-success">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Result: {prettyResult(interview.result)}
          </span>
          <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "h-3 w-3",
                  s <= (interview.rating ?? 0) ? "fill-warning text-warning" : "text-border"
                )}
                aria-hidden="true"
              />
            ))}
          </span>
        </div>
        {interview.feedback && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{interview.feedback}</p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/40 p-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" /> Submit scorecard
      </button>
    );
  }

  async function submit() {
    setBusy(true);
    // ✅ EXACT contract (interview.ts Ln 175):
    // { interviewId, result: "PASSED"|"FAILED"|"PENDING", rating, feedback } — NO jobId
    const res = await submitInterviewFeedbackAction({
      interviewId: interview.id,
      result,
      rating,
      feedback: feedback.trim(),
    });
    setBusy(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Scorecard saved.");
      onSaved(interview.id, result, rating, feedback.trim());
    }
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex gap-1.5">
        {(["PASSED", "FAILED"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setResult(r)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all",
              result === r
                ? r === "PASSED"
                  ? "border border-success/30 bg-success/10 text-success"
                  : "border border-destructive/30 bg-destructive/10 text-destructive"
                : "border border-border/40 text-muted-foreground hover:text-foreground"
            )}
          >
            {r === "PASSED" ? "Passed" : "Failed"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setRating(s)} aria-label={`Rate ${s} stars`}>
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                s <= rating ? "fill-warning text-warning" : "text-border hover:text-warning/50"
              )}
              aria-hidden="true"
            />
          </button>
        ))}
        <span className="ml-1 text-[10px] font-semibold text-muted-foreground">{rating}/5</span>
      </div>

      <Input
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Structured feedback notes…"
        className="h-9 rounded-lg bg-background/70 text-xs"
      />

      <div className="flex gap-1.5">
        <Button size="sm" onClick={submit} disabled={busy} className="h-8 flex-1 rounded-lg text-[11px]">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : "Save scorecard"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 rounded-lg text-[11px]">
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────── Rate the interviewer back ─────────────────── */
function InterviewerRatingWidget({
  interview,
  onRated,
}: {
  interview: GlobalInterview;
  onRated: (id: string, rating: number) => void;
}) {
  const [busy, setBusy] = useState(false);

  if (interview.interviewerRating !== null) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <ThumbsUp className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
          You rated {interview.interviewer}
        </span>
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={cn(
                "h-3 w-3",
                s <= (interview.interviewerRating ?? 0) ? "fill-warning text-warning" : "text-border"
              )}
              aria-hidden="true"
            />
          ))}
        </span>
      </div>
    );
  }

  async function rate(value: number) {
    setBusy(true);
    const res = await rateInterviewerAction(interview.id, value);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`You rated ${interview.interviewer} ${value}/5.`);
      onRated(interview.id, value);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        Rate interviewer {interview.interviewer}
      </span>
      <span className="flex items-center gap-0.5">
        {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />}
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => rate(s)} disabled={busy} aria-label={`Rate ${s} stars`}>
            <Star className="h-4 w-4 text-border transition-colors hover:fill-warning hover:text-warning" aria-hidden="true" />
          </button>
        ))}
      </span>
    </div>
  );
}

/* ───────────────────────── Cancel interview ───────────────────────── */
function CancelInterviewButton({
  interviewId,
  onCancelled,
}: {
  interviewId: string;
  onCancelled: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Cancel interview"
        title="Cancel interview"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  async function cancel() {
    setBusy(true);
    const res = await cancelInterviewAction(interviewId);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Interview cancelled — candidate notified.");
      onCancelled(interviewId);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-1.5 py-1">
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="rounded-md bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Keep interview"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ───────────────────────── Main page ───────────────────────── */
export default function InterviewsPoolClient({
  initialInterviews,
  initialHasMore,
}: {
  initialInterviews: GlobalInterview[];
  initialHasMore: boolean;
}) {
  const [interviews, setInterviews] = useState<GlobalInterview[]>(initialInterviews);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getAllInterviewsAction(nextPage);
    if (res.error) {
      toast.error(res.error);
    } else {
      setInterviews((current) => [...current, ...(res.interviews as GlobalInterview[])]);
      setPage(nextPage);
      setHasMore(res.hasMore);
    }
    setIsLoadingMore(false);
  }, [page]);

  const updateInterviewFeedback = useCallback(
    (id: string, result: string, rating: number, feedback: string) => {
      setInterviews((current) =>
        current.map((i) => (i.id === id ? { ...i, result, rating, feedback } : i))
      );
    },
    []
  );

  const updateInterviewerRating = useCallback((id: string, interviewerRating: number) => {
    setInterviews((current) =>
      current.map((i) => (i.id === id ? { ...i, interviewerRating } : i))
    );
  }, []);

  const removeCancelledInterview = useCallback((id: string) => {
    setInterviews((current) => current.filter((i) => i.id !== id));
  }, []);

  if (interviews.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Interview Schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track upcoming candidate assessments and evaluation loops.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-background/50">
            <CalendarClock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold">No interviews scheduled yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Use the &quot;Schedule&quot; button on a candidate&apos;s Kanban card to book rounds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Interview Schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track upcoming candidate assessments and evaluation loops.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {interviews.map((interview, i) => {
          const dateObj = new Date(interview.scheduledAt);
          const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const dateStr = dateObj.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={interview.id}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border/40 pb-4">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      {interview.round}
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {interview.application?.candidate?.fullName}
                    </h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {interview.application?.candidate?.email}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-medium text-foreground/90">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {timeStr}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">{dateStr}</div>
                    </div>
                    <CancelInterviewButton
                      interviewId={interview.id}
                      onCancelled={removeCancelledInterview}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/10">
                      <Briefcase className="h-4 w-4 text-chart-2" aria-hidden="true" />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] text-muted-foreground">Position</p>
                      <p className="truncate text-sm font-medium text-foreground/90">
                        {interview.application?.job?.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                      <UserCheck className="h-4 w-4 text-warning" aria-hidden="true" />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] text-muted-foreground">Interviewer</p>
                      <p className="truncate text-sm font-medium text-foreground/90">
                        {interview.interviewer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meet link */}
                {interview.meetingLink && (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary transition-all hover:scale-[1.01] hover:bg-primary/20"
                  >
                    <Video className="h-4 w-4" aria-hidden="true" /> Join Google Meet
                  </a>
                )}

                {/* Scorecard + interviewer rating */}
                <ScorecardForm interview={interview} onSaved={updateInterviewFeedback} />
                <InterviewerRatingWidget interview={interview} onRated={updateInterviewerRating} />
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="gap-2 rounded-xl text-xs font-semibold"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}