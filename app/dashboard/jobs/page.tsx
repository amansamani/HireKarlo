"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MapPin, Briefcase, Users, ArrowRight, Plus, Loader2, Trash2, X } from "lucide-react";
import { getAllJobsAction, updateJobStatusAction, deleteJobAction } from "@/actions/jobs-pool";
import { Button } from "@/components/ui/button";

type GlobalJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  _count: {
    applications: number;
  };
};

function JobCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
    </div>
  );
}

export default function JobsPoolPage() {
  const [jobs, setJobs] = useState<GlobalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobs() {
      const res = await getAllJobsAction();
      if (res.jobs) setJobs(res.jobs as any);
      setLoading(false);
    }
    loadJobs();
  }, []);

  async function toggleStatus(job: GlobalJob) {
    const nextStatus = job.status === "OPEN" ? "CLOSED" : "OPEN";
    setUpdatingId(job.id);

    const prevJobs = jobs;
    setJobs((current) => current.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j)));

    const res = await updateJobStatusAction(job.id, nextStatus);

    if (res.error) {
      setJobs(prevJobs);
      toast.error(res.error);
    } else {
      toast.success(nextStatus === "OPEN" ? "Job reopened — accepting applicants again." : "Job closed — public link no longer accepts applicants.");
    }
    setUpdatingId(null);
  }

  async function deleteJob(job: GlobalJob) {
    setDeletingId(job.id);
    const res = await deleteJobAction(job.id);
    setDeletingId(null);
    setConfirmingDeleteId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      setJobs((current) => current.filter((j) => j.id !== job.id));
      toast.success(res.success || "Job deleted.");
    }
  }

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

      {loading ? (
        <div className="grid grid-cols-1 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-12 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No positions created yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add your first role to start collecting public resumes.</p>
          <Link href="/dashboard/jobs/create" className="mt-4 inline-block">
            <Button size="sm" className="text-xs font-semibold">Create your first position</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-semibold text-foreground">{job.title}</h3>
                  <button
                    type="button"
                    onClick={() => toggleStatus(job)}
                    disabled={updatingId === job.id}
                    title={job.status === "OPEN" ? "Click to close this job" : "Click to reopen this job"}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium transition-colors disabled:opacity-60 ${
                      job.status === "OPEN"
                        ? "border border-success/30 bg-success/10 text-success hover:bg-success/20"
                        : "border border-border bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {updatingId === job.id ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                    ) : null}
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

                {confirmingDeleteId === job.id ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1">
                    <span className="text-[11px] font-medium text-destructive">Delete this job?</span>
                    <button
                      type="button"
                      onClick={() => deleteJob(job)}
                      disabled={deletingId === job.id}
                      className="rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {deletingId === job.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
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
                    onClick={() => setConfirmingDeleteId(job.id)}
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
          ))}
        </div>
      )}
    </div>
  );
}