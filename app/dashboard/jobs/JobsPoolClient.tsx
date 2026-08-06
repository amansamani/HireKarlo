"use client";

import { useState, useTransition, useEffect, useRef, memo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPin,
  Briefcase,
  Users,
  ArrowRight,
  Plus,
  Loader2,
  Trash2,
  X,
  Search,
  Filter,
} from "lucide-react";
import {
  updateJobStatusAction,
  deleteJobAction,
  getAllJobsAction,
} from "@/actions/jobs-pool";
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-foreground">{job.title}</h3>
            <button
              type="button"
              onClick={() => onToggleStatus(job)}
              disabled={updatingId === job.id || isPending}
              title={
                job.status === "OPEN" ? "Click to close this job" : "Click to reopen this job"
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-all duration-200 disabled:opacity-60 ${
                job.status === "OPEN"
                  ? "border border-success/30 bg-success/10 text-success hover:bg-success/20"
                  : "border border-border bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {updatingId === job.id && (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              )}
              {job.status === "OPEN" && (
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
              )}
              {job.status.toLowerCase()}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground/80">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              {job.department}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {job.type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border/40 pt-4 sm:border-0 sm:pt-0">
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">
              {job._count.applications}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              applicants
            </span>
          </div>

          {isConfirmingDelete ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
              <span className="text-xs font-medium text-destructive">Delete?</span>
              <button
                type="button"
                onClick={() => onDeleteJob(job)}
                disabled={deletingId === job.id}
                className="rounded-lg bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {deletingId === job.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  "Delete"
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={deletingId === job.id}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Cancel delete"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${job.title}`}
              title="Delete job"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <Link href={`/dashboard/jobs/${job.id}`}>
            <Button
              size="sm"
              className="gap-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-md"
            >
              View Pipeline
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default function JobsPoolClient({
  initialJobs,
  initialHasMore,
  canCreateJob,
}: {
  initialJobs: GlobalJob[];
  initialHasMore: boolean;
  canCreateJob: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await getAllJobsAction(
        1,
        searchQuery,
        statusFilter === "ALL" ? undefined : statusFilter
      );
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
  }, [searchQuery, statusFilter]);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const res = await getAllJobsAction(
      nextPage,
      searchQuery,
      statusFilter === "ALL" ? undefined : statusFilter
    );
    if (res.error) {
      toast.error(res.error);
    } else {
      setJobs((current) => [...current, ...(res.jobs as GlobalJob[])]);
      setPage(nextPage);
      setHasMore(res.hasMore);
    }
    setIsLoadingMore(false);
  }, [page, searchQuery, statusFilter]);

  const toggleStatus = useCallback(
    (job: GlobalJob) => {
      const nextStatus: JobStatus = job.status === "OPEN" ? "CLOSED" : "OPEN";
      setUpdatingId(job.id);

      setJobs((current) =>
        current.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j))
      );

      startTransition(async () => {
        const res = await updateJobStatusAction(job.id, nextStatus);
        if (res.error) {
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
    },
    [router]
  );

  const deleteJob = useCallback(
    (job: GlobalJob) => {
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
    },
    [router]
  );

  const hasActiveFilter = searchQuery.trim() !== "" || statusFilter !== "ALL";

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Job Openings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your active listings and incoming pipeline volume.
          </p>
        </div>
        {canCreateJob && (
          <Link href="/dashboard/jobs/create" className="self-start">
            <Button className="gap-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.02]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Position
            </Button>
          </Link>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Search by title, department, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-11 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            aria-label="Search jobs"
          />
          {isSearching && (
            <Loader2
              className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex gap-1.5">
            {(["ALL", "OPEN", "CLOSED", "FILLED"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  statusFilter === s
                    ? "border border-primary/40 bg-primary/10 text-primary shadow-sm"
                    : "border border-border/40 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 backdrop-blur-sm py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-background/50 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-foreground">
            {hasActiveFilter ? "No jobs match your filters" : "No positions created yet"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {hasActiveFilter
              ? "Try a different search term or status."
              : "Add your first role to start collecting public resumes."}
          </p>
          {!hasActiveFilter && canCreateJob && (
            <Link href="/dashboard/jobs/create" className="mt-6 inline-block">
              <Button
                size="sm"
                className="gap-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create your first position
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Job List */}
      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job, i) => (
          <div
            key={job.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <JobCard
              job={job}
              updatingId={updatingId}
              deletingId={deletingId}
              isPending={isPending}
              onToggleStatus={toggleStatus}
              onDeleteJob={deleteJob}
            />
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && jobs.length > 0 && (
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