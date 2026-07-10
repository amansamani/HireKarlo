"use client";

import { useEffect, useState, startTransition, use } from "react";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, CheckCircle2, XCircle, Clock, Briefcase, Activity, Calendar } from "lucide-react";
import Link from "next/link";
import { getJobApplicantsAction, updateApplicationStatusAction } from "@/actions/application";
import { scheduleInterviewAction } from "@/actions/interview";

type Application = {
  id: string;
  stage: string;
  createdAt: Date | string;
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
  { key: "APPLIED", name: "Applied", color: "text-blue-400 bg-blue-950/40 border-blue-800/60" },
  { key: "TECHNICAL", name: "Technical Interview", color: "text-purple-400 bg-purple-950/40 border-purple-800/60" },
  { key: "HR", name: "HR Round", color: "text-amber-400 bg-amber-950/40 border-amber-800/60" },
  { key: "OFFER", name: "Offer", color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" },
  { key: "REJECTED", name: "Rejected", color: "text-rose-400 bg-rose-950/40 border-rose-800/60" },
];

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeModalApp, setActiveModalApp] = useState<{ id: string; targetStage: string } | null>(null);
  const [interviewer, setInterviewer] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  async function fetchApplicants() {
    const res = await getJobApplicantsAction(jobId) as any;
    if (res.applications) setApplicants(res.applications);
    if (res.logs || res.activityLogs) setLogs(res.activityLogs || res.logs);
    setLoading(false);
  }

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

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
        fetchApplicants();
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
        setActiveModalApp(null);
        setInterviewer("");
        setScheduleTime("");
        fetchApplicants();
      }
    });
  }

  return (
    <div className="space-y-10 text-zinc-100 p-6 max-w-7xl mx-auto relative">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jobs" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Applicant Pipeline</h2>
          <p className="text-sm text-zinc-400">Track and progress candidates through evaluation phases.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Loading pipeline columns...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
            {PIPELINE_STAGES.map((stage) => {
              const stageApplicants = applicants.filter((app) => app.stage === stage.key);

              return (
                <div key={stage.key} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4 min-h-[400px]">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${stage.color}`}>
                      {stage.name}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {stageApplicants.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stageApplicants.length === 0 ? (
                      <div className="text-center py-8 text-xs text-zinc-600 border border-dashed border-zinc-800/60 rounded-lg">No candidates</div>
                    ) : (
                      stageApplicants.map((app) => (
                        <div key={app.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-3 shadow-sm hover:border-zinc-700 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                              <User className="h-3.5 w-3.5 text-zinc-500" />
                              {app.candidate?.fullName || "Unnamed Candidate"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <Mail className="h-3.5 w-3.5 text-zinc-500" />
                              {app.candidate?.email || "No email provided"}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-900">
                            {stage.key !== "TECHNICAL" && (
                              <button onClick={() => handleStatusChange(app.id, "TECHNICAL")} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-purple-400 transition-colors" title="Schedule Technical Interview">
                                <Briefcase className="h-3.5 w-3.5" />
                              </button>
                            )}
                            
                            {stage.key !== "HR" && (
                              <button onClick={() => handleStatusChange(app.id, "HR")} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-amber-400 transition-colors" title="Schedule HR Round">
                                <Clock className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {stage.key !== "OFFER" && (
                              <button onClick={() => handleStatusChange(app.id, "OFFER")} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400 transition-colors" title="Extend Offer">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {stage.key !== "REJECTED" ? (
                              <button onClick={() => handleStatusChange(app.id, "REJECTED")} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-400 transition-colors" title="Mark as Rejected">
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button onClick={() => handleStatusChange(app.id, "APPLIED")} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-400 transition-colors" title="Reset back to Applied">
                                <ArrowLeft className="h-3.5 w-3.5" />
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

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Activity className="h-4 w-4 text-zinc-400" />
              <h3 className="text-sm font-semibold tracking-tight text-zinc-200">Recent Pipeline Activity Audit Trail</h3>
            </div>
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
              {logs.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No movements recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between text-xs border-b border-zinc-900 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <p className="text-zinc-300 font-medium">{log.details || log.action}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeModalApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-xl p-5 space-y-4 shadow-xl">
            <div>
              <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-400" /> Setup Evaluation Interview Loop
              </h4>
              <p className="text-xs text-zinc-400 mt-1">Provide routing metadata to book this entry into Postgres.</p>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Interviewer Name</label>
                <input type="text" value={interviewer} onChange={(e) => setInterviewer(e.target.value)} placeholder="e.g., Lead Architect" className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700" required />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Date & Time</label>
                <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700 color-scheme-dark" required />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/60">
                <button type="button" onClick={() => setActiveModalApp(null)} className="px-3 py-1.5 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold transition-colors">
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}