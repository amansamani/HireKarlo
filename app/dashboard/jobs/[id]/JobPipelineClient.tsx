"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, ArrowLeft as ArrowLeftSm, Link2, FileText,
  CalendarPlus, Loader2, UserX, RotateCcw, Sparkles, Users, ListChecks,
} from "lucide-react";

import { updateApplicationStatusAction } from "@/actions/application";
import { scheduleInterviewAction } from "@/actions/interview";
import { getTeamAction } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ✅ Dynamic: the FIRST stage is always "Applied" (incoming),
// then the job's custom interviewRounds, then "Rejected" (always present).
const APPLIED_STAGE = "Applied";
const REJECTED_STAGE = "Rejected";

type PipelineApplication = {
  id: string;
  stage: string;
  aiScore: number | null;
  aiSummary: string | null;
  candidate: { fullName: string; email: string; resumeUrl: string | null };
};
type PipelineJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: "OPEN" | "CLOSED" | "FILLED";
  interviewRounds?: string[] | null;
};
type TeamMember = {
  id: string;
  role: string;
  user: { email: string; name: string | null } | null;
};

function stageColor(idx: number, total: number, name: string) {
  if (name === REJECTED_STAGE) {
    return { dot: "bg-destructive", chip: "text-destructive bg-destructive/10 border-destructive/30", border: "border-t-destructive" };
  }
  if (idx === 0) {
    return { dot: "bg-chart-2", chip: "text-chart-2 bg-chart-2/10 border-chart-2/30", border: "border-t-chart-2" };
  }
  // Cycle through primary / warning / success for middle stages
  const palette = [
    { dot: "bg-primary", chip: "text-primary bg-primary/10 border-primary/30", border: "border-t-primary" },
    { dot: "bg-warning", chip: "text-warning bg-warning/10 border-warning/30", border: "border-t-warning" },
    { dot: "bg-success", chip: "text-success bg-success/10 border-success/30", border: "border-t-success" },
    { dot: "bg-chart-4", chip: "text-chart-4 bg-chart-4/10 border-chart-4/30", border: "border-t-chart-4" },
  ];
  return palette[(idx - 1) % palette.length];
}

function scoreTone(score: number | null) {
  if (score === null) return "bg-muted text-muted-foreground border-border/40";
  if (score >= 80) return "bg-success/10 text-success border-success/30";
  if (score >= 60) return "bg-warning/10 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function SchedulePanel({
  applicationId, jobId, members, targetStage, onDone, onClose,
}: {
  applicationId: string;
  jobId: string;
  members: TeamMember[];
  targetStage: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [interviewerId, setInterviewerId] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!interviewerId || !when) return toast.error("Pick an interviewer and a time.");
    setBusy(true);
    const selected = members.find((m) => m.id === interviewerId);
    const res = await scheduleInterviewAction({
      applicationId,
      jobId,
      round: targetStage,
      interviewer: selected?.user?.name || selected?.user?.email || "",
      interviewerId,
      scheduledAt: new Date(when).toISOString(),
      targetStage,
    });
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Interview booked — Meet link & invite sent.");
      onDone();
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <select value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}
        className="h-9 w-full rounded-lg border border-border/60 bg-background/70 px-2 text-xs focus:outline-none focus:border-primary/60">
        <option value="">Select interviewer…</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.user?.name || m.user?.email} ({m.role.toLowerCase()})</option>
        ))}
      </select>
      <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-9 rounded-lg text-xs bg-background/70" />
      <div className="flex gap-1.5 pt-1">
        <Button size="sm" onClick={submit} disabled={busy} className="flex-1 h-8 rounded-lg text-[11px]">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : `Book ${targetStage}`}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 rounded-lg text-[11px]">Cancel</Button>
      </div>
    </div>
  );
}

function CandidateCard({
  app, jobId, stages, members, onMoved,
}: {
  app: PipelineApplication;
  jobId: string;
  stages: string[];
  members: TeamMember[];
  onMoved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [scheduling, setScheduling] = useState(false);

  function move(to: string) {
    startTransition(async () => {
      const res = await updateApplicationStatusAction(app.id, to, jobId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(`${app.candidate.fullName} moved to ${to}.`);
        onMoved();
      }
    });
  }

  const idx = stages.indexOf(app.stage);
  const prev = idx > 0 ? stages[idx - 1] : null;
  const next = idx >= 0 && idx < stages.length - 1 && app.stage !== REJECTED_STAGE ? stages[idx + 1] : null;

  return (
    <div className="group relative rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border/70 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{app.candidate.fullName}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{app.candidate.email}</p>
        </div>
        <span className={cn("flex h-7 min-w-9 shrink-0 items-center justify-center gap-1 rounded-lg border px-1.5 text-[10px] font-bold", scoreTone(app.aiScore))}
          title={app.aiSummary ?? "AI match score"}>
          <Sparkles className="h-2.5 w-2.5" />
          {app.aiScore !== null ? `${app.aiScore}%` : "—"}
        </span>
      </div>

      {app.aiSummary && <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{app.aiSummary}</p>}

      <div className="mt-3 flex items-center gap-1.5">
        {app.candidate.resumeUrl && (
          <a href={app.candidate.resumeUrl} target="_blank" rel="noopener noreferrer"
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-border/40 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50">
            <FileText className="h-3 w-3" /> Resume
          </a>
        )}
        {next && next !== REJECTED_STAGE && (
          <button type="button" onClick={() => setScheduling((s) => !s)}
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20">
            <CalendarPlus className="h-3 w-3" /> Schedule
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2">
        {prev && (
          <button type="button" disabled={isPending} onClick={() => move(prev)}
            className="flex h-6 flex-1 items-center justify-center rounded-md text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50">
            <ArrowLeftSm className="h-3 w-3" /> Prev
          </button>
        )}
        {next && (
          <button type="button" disabled={isPending} onClick={() => move(next)}
            className="flex h-6 flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50">
            {next} <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {app.stage !== REJECTED_STAGE ? (
          <button type="button" disabled={isPending} onClick={() => move(REJECTED_STAGE)} title="Reject"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
            <UserX className="h-3 w-3" />
          </button>
        ) : (
          <button type="button" disabled={isPending} onClick={() => move(stages[0])}
            className="flex h-6 flex-1 items-center justify-center gap-1 rounded-md text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Restore
          </button>
        )}
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {scheduling && next && (
        <SchedulePanel
          applicationId={app.id}
          jobId={jobId}
          members={members}
          targetStage={next}
          onDone={() => { setScheduling(false); onMoved(); }}
          onClose={() => setScheduling(false)}
        />
      )}
    </div>
  );
}

export default function JobPipelineClient({
  job, initialApplications,
}: {
  job: PipelineJob;
  initialApplications: PipelineApplication[];
}) {
  const router = useRouter();
  const [applications] = useState(initialApplications);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // ✅ Build stages dynamically: "Applied" + custom rounds + "Rejected"
  const stages = [
    APPLIED_STAGE,
    ...(job.interviewRounds ?? []).filter((r) => r && r !== APPLIED_STAGE && r !== REJECTED_STAGE),
    REJECTED_STAGE,
  ];

  useEffect(() => {
    (async () => {
      const res = await getTeamAction();
      if (res && !("error" in res && res.error)) setMembers(res.members ?? []);
    })();
  }, []);

  function copyPublicLink() {
    navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`);
    toast.success("Public apply link copied to clipboard.");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-card/50 text-muted-foreground transition-colors hover:text-foreground" aria-label="Back to jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight">{job.title}</h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                job.status === "OPEN" ? "border border-success/30 bg-success/10 text-success" : "border border-border bg-muted text-muted-foreground")}>
                {job.status.toLowerCase()}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {job.department} · {job.location} · {job.type.replace("_", " ").toLowerCase()}
              </p>
              <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <ListChecks className="h-3 w-3" /> {stages.length - 2} custom rounds
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-muted/30 px-3 py-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-bold">{applications.length}</span>
            <span className="text-[10px] text-muted-foreground">applicants</span>
          </div>
          <Button variant="outline" size="sm" onClick={copyPublicLink} className="gap-1.5 rounded-xl text-xs font-semibold">
            <Link2 className="h-3.5 w-3.5" /> Copy apply link
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5" style={{ gridTemplateColumns: `repeat(${Math.min(stages.length, 5)}, minmax(0, 1fr))` }}>
        {stages.map((stage, i) => {
          const colors = stageColor(i, stages.length, stage);
          const cards = applications.filter((a) => a.stage === stage);
          return (
            <div key={stage}
              className={cn("flex min-h-[300px] flex-col rounded-2xl border border-border/40 border-t-2 bg-card/30 backdrop-blur-sm", colors.border)}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", colors.dot)} />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">{stage}</span>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", colors.chip)}>{cards.length}</span>
              </div>
              <div className="flex-1 space-y-3 px-3 pb-3">
                {cards.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/40 text-[11px] text-muted-foreground">No candidates</div>
                ) : (
                  cards.map((app) => (
                    <CandidateCard key={app.id} app={app} jobId={job.id} stages={stages} members={members} onMoved={() => router.refresh()} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}