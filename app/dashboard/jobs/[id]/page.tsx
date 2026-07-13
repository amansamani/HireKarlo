"use client";

import { useEffect, useState, startTransition, use, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, CheckCircle2, XCircle, Clock, Briefcase, Activity, Calendar, X } from "lucide-react";
import Link from "next/link";
import { getJobApplicantsAction, updateApplicationStatusAction } from "@/actions/application";
import { scheduleInterviewAction } from "@/actions/interview";
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
  };
};

type ActivityLog = {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date | string;
  user: { name: string | null; email: string };
};

const PIPELINE_STAGES = [
  { key: "APPLIED", name: "Applied", color: "text-chart-2 bg-chart-2/10 border-chart-2/30" },
  { key: "TECHNICAL", name: "Technical Interview", color: "text-primary bg-primary/10 border-primary/30" },
  { key: "HR", name: "HR Round", color: "text-warning bg-warning/10 border-warning/30" },
  { key: "OFFER", name: "Offer", color: "text-success bg-success/10 border-success/30" },
  { key: "REJECTED", name: "Rejected", color: "text-destructive bg-destructive/10 border-destructive/30" },
];

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeModalApp, setActiveModalApp] = useState<{ id: string; targetStage: string } | null>(null);
  const [interviewer, setInterviewer] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchApplicants() {
      const res = await getJobApplicantsAction(jobId) as any;
      if (cancelled) return;
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
  }, []);

  useEffect(() => {
    if (!activeModalApp) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModalApp, closeModal]);

  function handleStatusChange(applicationId: string, newStatus: string) {
    if (newStatus === "TECHNICAL" || newStatus === "HR") {
      setActiveModalApp({ id: applicationId, targetStage: newStatus });
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
        round: activeModalApp.targetStage === "TECHNICAL" ? "Technical Interview Loop" : "HR Assessment Round",
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

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <>
          {/* Kanban: horizontal scroll with snap on narrower viewports, full grid on wide desktop */}
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
            {PIPELINE_STAGES.map((stage) => {
              const stageApplicants = applicants.filter((app) => app.stage === stage.key);

              return (
                <div
                  key={stage.key}
                  className="min-h-[400px] w-[80vw] shrink-0 snap-start space-y-4 rounded-xl border border-border bg-card p-4 sm:w-[45vw] lg:w-auto"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${stage.color}`}>
                      {stage.name}
                    </span>
                    <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {stageApplicants.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageApplicants.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                        No candidates
                      </div>
                    ) : (
                      stageApplicants.map((app) => (
                        <div
                          key={app.id}
                          className="space-y-3 rounded-lg border border-border bg-background/60 p-3.5 shadow-sm transition-colors hover:border-primary/40"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                {app.candidate?.fullName || "Unnamed Candidate"}
                              </div>
                              {typeof app.matchScore === "number" && (
                                <span
                                  className={`rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                    app.matchScore >= 70
                                      ? "border-success/30 bg-success/10 text-success"
                                      : app.matchScore >= 40
                                      ? "border-warning/30 bg-warning/10 text-warning"
                                      : "border-border bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {app.matchScore}%
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                              {app.candidate?.email || "No email provided"}
                            </div>
                            {app.aiSummary && (
                              <p className="line-clamp-2 pt-1 text-[11px] italic text-muted-foreground">
                                {app.aiSummary}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                            {stage.key !== "TECHNICAL" && (
                              <button
                                onClick={() => handleStatusChange(app.id, "TECHNICAL")}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                                aria-label={`Schedule technical interview for ${app.candidate?.fullName || "candidate"}`}
                                title="Schedule Technical Interview"
                              >
                                <Briefcase className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}

                            {stage.key !== "HR" && (
                              <button
                                onClick={() => handleStatusChange(app.id, "HR")}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-warning"
                                aria-label={`Schedule HR round for ${app.candidate?.fullName || "candidate"}`}
                                title="Schedule HR Round"
                              >
                                <Clock className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}

                            {stage.key !== "OFFER" && (
                              <button
                                onClick={() => handleStatusChange(app.id, "OFFER")}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-success"
                                aria-label={`Extend offer to ${app.candidate?.fullName || "candidate"}`}
                                title="Extend Offer"
                              >
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}

                            {stage.key !== "REJECTED" ? (
                              <button
                                onClick={() => handleStatusChange(app.id, "REJECTED")}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                                aria-label={`Mark ${app.candidate?.fullName || "candidate"} as rejected`}
                                title="Mark as Rejected"
                              >
                                <XCircle className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(app.id, "APPLIED")}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-chart-2"
                                aria-label={`Reset ${app.candidate?.fullName || "candidate"} back to applied`}
                                title="Reset back to Applied"
                              >
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
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