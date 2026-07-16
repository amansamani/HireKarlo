"use client";

import { useEffect, useMemo, useState, startTransition, use, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, FileText, XCircle, ChevronDown, Activity, Calendar, X, Copy, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getJobApplicantsAction, updateApplicationStatusAction, rescoreApplicationAction } from "@/actions/application";
import { scheduleInterviewAction } from "@/actions/interview";
import { deleteJobAction } from "@/actions/jobs-pool";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Application = {
  id: string;
  stage: string;
  createdAt: Date | string;
  matchScore?: number | null;
  aiSummary?: string | null;
  candidate?: {
    fullName: string;
    email: string;
    resumeUrl?: string | null;
  };
};

type ActivityLog = {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date | string;
  user: { name: string | null; email: string };
};

type JobInfo = { title?: string; interviewRounds: string[] };

type StageConfig = {
  key: string;
  name: string;
  /** Stages that represent an actual interview loop prompt for scheduling before the move completes. */
  needsSchedule: boolean;
  classes: string;
};

const APPLIED_CLASSES = "text-chart-2 bg-chart-2/10 border-chart-2/30";
const ROUND_PALETTE = [
  "text-chart-3 bg-chart-3/10 border-chart-3/30",
  "text-chart-1 bg-chart-1/10 border-chart-1/30",
  "text-chart-4 bg-chart-4/10 border-chart-4/30",
  "text-chart-2 bg-chart-2/10 border-chart-2/30",
];
const HR_CLASSES = "text-warning bg-warning/10 border-warning/30";
const OFFER_CLASSES = "text-success bg-success/10 border-success/30";
const HIRED_CLASSES = "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
const REJECTED_CLASSES = "text-destructive bg-destructive/10 border-destructive/30";

/**
 * Recruiter defines their own round names at job-creation time (e.g. "OA",
 * "DSA", "Backend Round"). Those become the pipeline columns for this job,
 * sandwiched between the fixed Applied start and the fixed HR/Offer/Hired/
 * Rejected tail. Jobs created without custom rounds fall back to a single
 * generic "Technical Interview" middle stage.
 */
function buildStages(interviewRounds: string[]): StageConfig[] {
  const middleRounds = interviewRounds.length > 0 ? interviewRounds : ["Technical Interview"];

  return [
    { key: "APPLIED", name: "Applied", needsSchedule: false, classes: APPLIED_CLASSES },
    ...middleRounds.map((round, i) => ({
      key: round,
      name: round,
      needsSchedule: true,
      classes: ROUND_PALETTE[i % ROUND_PALETTE.length],
    })),
    { key: "HR", name: "HR Round", needsSchedule: true, classes: HR_CLASSES },
    { key: "OFFER", name: "Offer", needsSchedule: false, classes: OFFER_CLASSES },
    { key: "HIRED", name: "Hired", needsSchedule: false, classes: HIRED_CLASSES },
    { key: "REJECTED", name: "Rejected", needsSchedule: false, classes: REJECTED_CLASSES },
  ];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const router = useRouter();
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [rescoringId, setRescoringId] = useState<string | null>(null);

  const [activeModalApp, setActiveModalApp] = useState<{ id: string; targetStage: string } | null>(null);
  const [interviewer, setInterviewer] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [roundName, setRoundName] = useState("");

  const stages = useMemo(() => buildStages(job?.interviewRounds ?? []), [job]);

  useEffect(() => {
    let cancelled = false;

    async function fetchApplicants() {
      const res = (await getJobApplicantsAction(jobId)) as any;
      if (cancelled) return;
      if (res.job) setJob(res.job);
      if (res.applications) setApplicants(res.applications);
      if (res.logs || res.activityLogs) setLogs(res.activityLogs || res.logs);
      setLoading(false);
    }

    fetchApplicants();

    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  const closeModal = useCallback(() => {
    setActiveModalApp(null);
    setInterviewer("");
    setScheduleTime("");
    setRoundName("");
  }, []);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyApplyLink() {
    const url = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success("Application link copied!");
  }

  async function deleteJob() {
    setDeletingJob(true);
    const res = await deleteJobAction(jobId);
    setDeletingJob(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.success || "Job deleted.");
      router.push("/dashboard/jobs");
    }
  }

  async function rescoreApplication(applicationId: string) {
    setRescoringId(applicationId);
    const res = await rescoreApplicationAction(applicationId, jobId);
    setRescoringId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.success || "Scored.");
      setRefreshKey((k) => k + 1);
    }
  }

  useEffect(() => {
    if (!activeModalApp) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModalApp, closeModal]);

  function handleStatusChange(applicationId: string, newStatus: string) {
    const target = stages.find((s) => s.key === newStatus);

    if (target?.needsSchedule) {
      setActiveModalApp({ id: applicationId, targetStage: newStatus });
      setRoundName(target.name);
      return;
    }

    startTransition(async () => {
      const res = await updateApplicationStatusAction(applicationId, newStatus, jobId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(res?.success);
        setRefreshKey((k) => k + 1);
      }
    });
  }

  function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewer || !scheduleTime || !activeModalApp) {
      toast.error("Please provide all scheduling properties.");
      return;
    }

    startTransition(async () => {
      const scheduleRes = await scheduleInterviewAction({
        applicationId: activeModalApp.id,
        round: roundName,
        interviewer,
        scheduledAt: scheduleTime,
        jobId,
      });

      if (scheduleRes.error) {
        toast.error(scheduleRes.error);
        return;
      }

      const updateRes = await updateApplicationStatusAction(activeModalApp.id, activeModalApp.targetStage, jobId);
      if (updateRes.error) toast.error(updateRes.error);
      else {
        toast.success("Interview scheduled and candidate moved!");
        closeModal();
        setRefreshKey((k) => k + 1);
      }
    });
  }

  return (
    <div className="relative mx-auto max-w-7xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/jobs"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to job openings"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Applicant Pipeline</h2>
            <p className="text-sm text-muted-foreground">Track and progress candidates through evaluation phases.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copyApplyLink} className="gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy Apply Link
          </Button>

          {confirmingDelete ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5">
              <span className="text-[11px] font-medium text-destructive">Delete this job?</span>
              <button
                type="button"
                onClick={deleteJob}
                disabled={deletingJob}
                className="rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {deletingJob ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deletingJob}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Cancel delete"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              aria-label="Delete this job"
              title="Delete job"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-64 w-72 shrink-0 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <>
          {/* Kanban: always horizontal-scroll, since column count is dynamic per job's rounds. */}
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 no-scrollbar">
            {stages.map((stage) => {
              const stageApplicants = applicants.filter((app) => app.stage === stage.key);
              const otherStages = stages.filter((s) => s.key !== stage.key);

              return (
                <div
                  key={stage.key}
                  className="min-h-[420px] w-72 shrink-0 snap-start space-y-4 overflow-hidden rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                    <span className={`inline-flex min-w-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${stage.classes}`}>
                      <span className="truncate">{stage.name}</span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {stageApplicants.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {stageApplicants.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                        No candidates
                      </div>
                    ) : (
                      stageApplicants.map((app) => {
                        const name = app.candidate?.fullName || "Unnamed Candidate";
                        const isOpen = expandedIds.has(app.id);

                        return (
                          <div
                            key={app.id}
                            className="overflow-hidden rounded-2xl border border-border bg-background/60 shadow-sm transition-colors hover:border-primary/40"
                          >
                            <button
                              type="button"
                              onClick={() => toggleExpand(app.id)}
                              aria-expanded={isOpen}
                              className="flex w-full min-w-0 items-center gap-2 px-3.5 py-3 text-left"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                                {initials(name)}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{name}</span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              />
                            </button>

                            {isOpen && (
                              <div className="space-y-2.5 border-t border-border px-3.5 pb-3.5 pt-3 text-xs">
                                <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{app.candidate?.email || "No email provided"}</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {app.candidate?.resumeUrl && (
                                    <a
                                      href={app.candidate.resumeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-primary hover:underline"
                                    >
                                      <FileText className="h-3 w-3" aria-hidden="true" /> Resume
                                    </a>
                                  )}
                                  {typeof app.matchScore === "number" ? (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                                        app.matchScore >= 70
                                          ? "border-success/30 bg-success/10 text-success"
                                          : app.matchScore >= 40
                                          ? "border-warning/30 bg-warning/10 text-warning"
                                          : "border-border bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      Score {app.matchScore}%
                                    </span>
                                  ) : app.candidate?.resumeUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => rescoreApplication(app.id)}
                                      disabled={rescoringId === app.id}
                                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
                                    >
                                      {rescoringId === app.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                      ) : null}
                                      {rescoringId === app.id ? "Scoring…" : "Not scored — Rescore"}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">Not scored</span>
                                  )}
                                </div>

                                {app.aiSummary && (
                                  <p className="line-clamp-2 italic text-muted-foreground">{app.aiSummary}</p>
                                )}

                                <div className="flex items-center gap-1.5 border-t border-border pt-2.5">
                                  <div className="relative min-w-0 flex-1">
                                    <select
                                      key={`${app.id}-${app.stage}`}
                                      defaultValue=""
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        e.target.value = "";
                                        if (value) handleStatusChange(app.id, value);
                                      }}
                                      className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 pr-7 text-[11px] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                    >
                                      <option value="" disabled>
                                        Move to…
                                      </option>
                                      {otherStages.map((s) => (
                                        <option key={s.key} value={s.key}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                  </div>
                                  {stage.key !== "REJECTED" && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(app.id, "REJECTED")}
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                                      aria-label={`Reject ${name}`}
                                      title="Reject candidate"
                                    >
                                      <XCircle className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Recent Pipeline Activity</h3>
            </div>
            <div className="max-h-[300px] space-y-3.5 overflow-y-auto pr-2">
              {logs.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No movements recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between border-b border-border pb-2.5 text-xs last:border-0 last:pb-0">
                    <p className="font-medium text-foreground/90">{log.details || log.action}</p>
                    <span className="shrink-0 pl-3 font-mono text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeModalApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-popover p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 id="schedule-modal-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-primary" aria-hidden="true" /> Schedule Interview
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">Set the interviewer and time to move this candidate.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="round-name" className="text-[11px] font-medium text-muted-foreground">
                  Round Name
                </label>
                <Input id="round-name" value={roundName} onChange={(e) => setRoundName(e.target.value)} placeholder="e.g., System Design Round" required />
                {job?.interviewRounds && job.interviewRounds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.interviewRounds.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoundName(r)}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                          roundName === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="interviewer-name" className="text-[11px] font-medium text-muted-foreground">
                  Interviewer Name
                </label>
                <Input
                  id="interviewer-name"
                  autoFocus
                  value={interviewer}
                  onChange={(e) => setInterviewer(e.target.value)}
                  placeholder="e.g., Lead Architect"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="schedule-time" className="text-[11px] font-medium text-muted-foreground">
                  Date &amp; Time
                </label>
                <Input
                  id="schedule-time"
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="secondary" size="sm" onClick={closeModal} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs font-semibold">
                  Confirm Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}