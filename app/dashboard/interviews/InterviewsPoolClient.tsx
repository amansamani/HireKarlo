"use client";

import { useCallback, useState } from "react";
import { Calendar, Briefcase, Clock, UserCheck, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllInterviewsAction } from "@/actions/interviews-pool";
import { submitInterviewFeedbackAction } from "@/actions/interview";
import { toast } from "sonner";

type GlobalInterview = {
  id: string;
  round: string;
  interviewer: string;
  scheduledAt: Date | string;
  result: string | null;
  rating: number | null;
  feedback: string | null;
  application: {
    job: { title: string };
    candidate: { fullName: string; email: string };
  };
};

function ScorecardForm({
  interview,
  onSaved,
}: {
  interview: GlobalInterview;
  onSaved: (id: string, result: string, rating: number, feedback: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<"PASSED" | "FAILED" | "PENDING">("PENDING");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  // Already has a scorecard — show it read-only, tap to reopen/edit.
  if (interview.result && !open) {
    return (
      <button
        type="button"
        onClick={() => {
          setResult(interview.result as "PASSED" | "FAILED" | "PENDING");
          setRating(interview.rating ?? 0);
          setFeedback(interview.feedback ?? "");
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-background/60 p-2 text-left text-xs"
      >
        <span
          className={`font-semibold ${
            interview.result === "PASSED"
              ? "text-success"
              : interview.result === "FAILED"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {interview.result}
        </span>
        <span className="flex items-center gap-0.5 text-muted-foreground">
          {interview.rating}/5 <Star className="h-3 w-3 fill-current" aria-hidden="true" />
        </span>
      </button>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setOpen(true)}>
        Add feedback
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex gap-1.5">
        {(["PASSED", "FAILED", "PENDING"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setResult(r)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              result === r ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
            <Star className={`h-4 w-4 ${n <= rating ? "fill-current text-warning" : "text-muted-foreground"}`} aria-hidden="true" />
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Notes on the candidate's performance..."
        className="w-full rounded-md border border-border bg-background p-2 text-xs"
        rows={2}
      />

      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="text-xs"
          disabled={saving || rating === 0}
          onClick={async () => {
            setSaving(true);
            const res = await submitInterviewFeedbackAction({
              interviewId: interview.id,
              result,
              rating,
              feedback,
            });
            setSaving(false);
            if (res.error) {
              toast.error(res.error);
            } else {
              toast.success("Feedback saved.");
              onSaved(interview.id, result, rating, feedback);
              setOpen(false);
            }
          }}
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />} Save
        </Button>
      </div>
    </div>
  );
}

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

  if (interviews.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Interview Schedule</h2>
          <p className="text-sm text-muted-foreground">Track upcoming candidate assessments and evaluation loops.</p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No interviews scheduled yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Use the quick actions on a candidate&apos;s Kanban card to schedule rounds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Interview Schedule</h2>
        <p className="text-sm text-muted-foreground">Track upcoming candidate assessments and evaluation loops.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {interviews.map((interview) => {
          const dateObj = new Date(interview.scheduledAt);
          const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const dateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

          return (
            <div
              key={interview.id}
              className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">
                    {interview.round}
                  </span>
                  <h3 className="pt-1 text-sm font-semibold text-foreground">
                    {interview.application?.candidate?.fullName}
                  </h3>
                </div>

                <div className="space-y-1 text-right text-xs font-medium text-muted-foreground">
                  <div className="flex items-center justify-end gap-1.5 text-foreground/80">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {timeStr}
                  </div>
                  <div className="font-mono text-[10px]">{dateStr}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <div className="truncate">
                    <p className="text-[10px] text-muted-foreground">Position</p>
                    <p className="truncate font-medium text-foreground/90">{interview.application?.job?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <div className="truncate">
                    <p className="text-[10px] text-muted-foreground">Interviewer</p>
                    <p className="truncate font-medium text-foreground/90">{interview.interviewer}</p>
                  </div>
                </div>
              </div>

              <ScorecardForm interview={interview} onSaved={updateInterviewFeedback} />
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}