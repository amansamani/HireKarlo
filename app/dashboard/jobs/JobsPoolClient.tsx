"use client";

import { useState, useTransition, useEffect, useRef, memo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Briefcase, Users, ArrowRight, Plus, Loader2, Trash2, X, Search } from "lucide-react";
import { updateJobStatusAction, deleteJobAction, getAllJobsAction } from "@/actions/jobs-pool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JobStatus = "OPEN" | "CLOSED" | "FILLED";
type StatusFilter = JobStatus | "ALL";

type GlobalJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: JobStatus;
  _count: { applications: number };
};

// --- MEMOIZED CHILD ROW COMPONENT ---
interface JobCardProps {
  job: GlobalJob;
  updatingId: string | null;
  deletingId: string | null;
  isPending: boolean;
  onToggleStatus: (job: GlobalJob) => void;
  onDeleteJob: (job: GlobalJob) => void;
}

const JobCard = memo(function JobCard({
  job,
  updatingId,
  deletingId,
  isPending,
  onToggleStatus,
  onDeleteJob,
}: JobCardProps) {
  // Localized confirmation state prevents parent and sibling rows from re-rendering
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
          <button
            type="button"
            onClick={() => onToggleStatus(job)}
            disabled={updatingId === job.id || isPending}
            title={job.status === "OPEN" ? "Click to close this job" : "Click to reopen this job"}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium transition-colors disabled:opacity-60 ${
              job.status === "OPEN"
                ? "border border-success/30 bg-success/10 text-success hover:bg-success/20"
                : "border border-border bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {updatingId === job.id && <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />}
            {job.status.toLowerCase()}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{job.department}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" /> {job.location}</span>
          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" aria-hidden="true" /> {job.type}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border pt-3 sm:justify-end sm:border-0 sm:pt-0">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-1.5 select-none">
          <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-bold text-foreground">{job._count.applications}</span>
          <span className="text-[10px] font-medium text-muted-foreground">Applicants</span>
        </div>

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1">
            <span className="text-[11px] font-medium text-destructive">Delete this job?</span>
            <button
              type="button"
              onClick={() => onDeleteJob(job)}
              disabled={deletingId === job.id}
              className="rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
            >
              {deletingId === job.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={deletingId === job.id}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Cancel delete"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            aria-label={`Delete ${job.title}`}
            title="Delete job"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <Link href={`/dashboard/jobs/${job.id}`}>
          <Button size="sm" className="gap-1.5 text-xs font-semibold">
            View <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  );
});

// --- MAIN CLIENT COMPONENT ---
export default function JobsPoolClient({
  initialJobs,
  initialHasMore,
}: {
  initialJobs: GlobalJob[];
  initialHasMore: boolean;
}) {
  const [jobs, setJobs] = useState<GlobalJob[]>(initialJobs);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search/filter run server-side (jobs can span many pages) — every change
  // resets to page 1 and replaces the list rather than appending.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await getAllJobsAction(1, searchQuery, statusFilter === "ALL" ? undefined : statusFilter);
      setIsSearching(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setJobs(res.jobs as GlobalJob[]);
      setPage(1);
      setHasMore(res.hasMore);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getAllJobsAction(nextPage, searchQuery, statusFilter === "ALL" ? undefined : statusFilter);
    if (res.error) {
      toast.error(res.error);
    } else {
      setJobs((current) => [...current, ...(res.jobs as GlobalJob[])]);
      setPage(nextPage);
      setHasMore(res.hasMore);
    }
    setIsLoadingMore(false);
  }, [page, searchQuery, statusFilter]);

  // Memoized handlers protect against cache misses in child elements
  const toggleStatus = useCallback((job: GlobalJob) => {
    const nextStatus: JobStatus = job.status === "OPEN" ? "CLOSED" : "OPEN";
    setUpdatingId(job.id);

    // Optimistic UI update
    setJobs((current) =>
      current.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j))
    );

    startTransition(async () => {
      const res = await updateJobStatusAction(job.id, nextStatus);
      if (res.error) {
        // Rollback layout changes if backend returns an error
        setJobs((current) =>
          current.map((j) => (j.id === job.id ? { ...j, status: job.status } : j))
        );
        toast.error(res.error);
      } else {
        toast.success(
          nextStatus === "OPEN"
            ? "Job reopened — accepting applicants again."
            : "Job closed — public link no longer accepts applicants."
        );
        router.refresh();
      }
      setUpdatingId(null);
    });
  }, [router]);

  const deleteJob = useCallback((job: GlobalJob) => {
    setDeletingId(job.id);
    startTransition(async () => {
      const res = await deleteJobAction(job.id);
      setDeletingId(null);

      if (res.error) {
        toast.error(res.error);
      } else {
        setJobs((current) => current.filter((j) => j.id !== job.id));
        toast.success(res.success || "Job deleted.");
        router.refresh();
      }
    });
  }, [router]);

  // Handle Empty State
  if (jobs.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Job Openings</h2>
            <p className="text-sm text-muted-foreground">Manage your active listings and incoming pipeline volume.</p>
          </div>
          <Link href="/dashboard/jobs/create" className="self-start">
            <Button className="gap-1.5 text-xs font-semibold">
              <Plus className="h-4 w-4" aria-hidden="true" /> Create Position
            </Button>
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No positions created yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first role to start collecting public resumes.</p>
          <Link href="/dashboard/jobs/create" className="mt-4 inline-block">
            <Button size="sm" className="text-xs font-semibold">Create your first position</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Handle List Grid State
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Job Openings</h2>
          <p className="text-sm text-muted-foreground">Manage your active listings and incoming pipeline volume.</p>
        </div>
        <Link href="/dashboard/jobs/create" className="self-start">
          <Button className="gap-1.5 text-xs font-semibold">
            <Plus className="h-4 w-4" aria-hidden="true" /> Create Position
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search by title, department, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
            aria-label="Search jobs"
          />
          {isSearching && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
        </div>
        <div className="flex gap-1.5">
          {(["ALL", "OPEN", "CLOSED", "FILLED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            updatingId={updatingId}
            deletingId={deletingId}
            isPending={isPending}
            onToggleStatus={toggleStatus}
            onDeleteJob={deleteJob}
          />
        ))}
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