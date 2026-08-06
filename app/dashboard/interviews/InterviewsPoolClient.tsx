"use client";

import { useCallback, useState } from "react";
import {
  Calendar,
  Briefcase,
  Clock,
  UserCheck,
  Loader2,
  Star,
  Video,
  Trash2,
  X,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllInterviewsAction } from "@/actions/interviews-pool";
import {
  submitInterviewFeedbackAction,
  rateInterviewerAction,
  cancelInterviewAction,
} from "@/actions/interview";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

// ScorecardForm, InterviewerRatingWidget, CancelInterviewButton remain the same
// ... (keeping the same internal components)

function ScorecardForm({
  interview,
  onSaved,
}: {
  interview: GlobalInterview;
  onSaved: (id: string, result: string, rating: number, feedback: string) => void;
}) {
  // ... same implementation
  return null; // placeholder - keep your existing implementation
}

function InterviewerRatingWidget({
  interview,
  onRated,
}: {
  interview: GlobalInterview;
  onRated: (id: string, rating: number) => void;
}) {
  // ... same implementation
  return null; // placeholder - keep your existing implementation
}

function CancelInterviewButton({
  interviewId,
  onCancelled,
}: {
  interviewId: string;
  onCancelled: (id: string) => void;
}) {
  // ... same implementation
  return null; // placeholder - keep your existing implementation
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
      setInterviews((current) => [...current, ...res.interviews]);
      setPage(nextPage);
      setHasMore(res.hasMore);
    }
    setIsLoadingMore(false);
  }, [page]);

  const updateInterviewFeedback = useCallback(
    (id: string, result: string, rating: number, feedback: string) => {
      setInterviews((current) =>
        current.map((i) =>
          i.id === id ? { ...i, result, rating, feedback } : i
        )
      );
    },
    []
  );

  const updateInterviewerRating = useCallback(
    (id: string, interviewerRating: number) => {
      setInterviews((current) =>
        current.map((i) =>
          i.id === id ? { ...i, interviewerRating } : i
        )
      );
    },
    []
  );

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
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 backdrop-blur-sm py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-background/50 mb-4">
            <CalendarClock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-foreground">
            No interviews scheduled yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Use the quick actions on a candidate&apos;s Kanban card to schedule rounds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Interview Schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track upcoming candidate assessments and evaluation loops.
        </p>
      </div>

      {/* Interview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {interviews.map((interview, i) => {
          const dateObj = new Date(interview.scheduledAt);
          const timeStr = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const dateStr = dateObj.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div
              key={interview.id}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border/40 pb-4">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {interview.round}
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {interview.application?.candidate?.fullName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {interview.application?.candidate?.email}
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-medium text-foreground/90">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {timeStr}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {dateStr}
                      </div>
                    </div>
                    <CancelInterviewButton
                      interviewId={interview.id}
                      onCancelled={removeCancelledInterview}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-2/10">
                      <Briefcase className="h-4 w-4 text-chart-2" aria-hidden="true" />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Position
                      </p>
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
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Interviewer
                      </p>
                      <p className="truncate text-sm font-medium text-foreground/90">
                        {interview.interviewer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meet Link */}
                {interview.meetingLink && (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/20 hover:scale-[1.01]"
                  >
                    <Video className="h-4 w-4" aria-hidden="true" />
                    Join Google Meet
                  </a>
                )}

                {/* Scorecard & Rating - keep your existing implementations */}
                <ScorecardForm interview={interview} onSaved={updateInterviewFeedback} />
                <InterviewerRatingWidget
                  interview={interview}
                  onRated={updateInterviewerRating}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs font-semibold"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Loading...
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