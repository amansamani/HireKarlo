"use client";

import { useEffect, useState } from "react";
import { Calendar, User, Briefcase, Clock, UserCheck, Loader2 } from "lucide-react";
import { getAllInterviewsAction } from "@/actions/interviews-pool";

type GlobalInterview = {
  id: string;
  round: string;
  interviewer: string;
  scheduledAt: Date | string;
  application: {
    job: { title: string };
    candidate: { fullName: string; email: string };
  };
};

export default function InterviewsPoolPage() {
  const [interviews, setInterviews] = useState<GlobalInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInterviews() {
      const res = await getAllInterviewsAction();
      if (res.interviews) setInterviews(res.interviews as any);
      setLoading(false);
    }
    loadInterviews();
  }, []);

  return (
    <div className="space-y-6 text-zinc-100 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Interview Schedule</h2>
        <p className="text-sm text-zinc-400">Track and monitor upcoming candidate assessments and evaluation loops.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          Loading assessment schedules...
        </div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
          <Calendar className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No interviews scheduled yet</p>
          <p className="text-xs text-zinc-600 mt-1">Use the quick actions on a candidate's Kanban card to schedule rounds.</p>
        </div>
      ) : (
        /* Scheduled Loops Timeline Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviews.map((interview) => (
            <div key={interview.id} className="border border-zinc-850 bg-zinc-900/20 rounded-xl p-4 space-y-4 hover:border-zinc-700 transition-colors shadow-sm">
              <div className="flex items-start justify-between border-b border-zinc-900 pb-3">
                <div className="space-y-0.5">
                  <span className="inline-flex items-center rounded-full bg-purple-950/40 text-purple-400 border border-purple-900/60 px-2 py-0.5 text-[10px] font-medium tracking-wide">
                    {interview.round}
                  </span>
                  <h3 className="font-semibold text-zinc-200 text-sm pt-1">
                    {interview.application?.candidate?.fullName}
                  </h3>
                </div>
                
                <div className="text-right text-xs text-zinc-500 font-medium space-y-1">
                  <div className="flex items-center gap-1.5 justify-end text-zinc-400">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {new Date(interview.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1">
                <div className="flex items-center gap-2 bg-zinc-950/30 border border-zinc-900 p-2 rounded-lg">
                  <Briefcase className="h-3.5 w-3.5 text-zinc-500" />
                  <div className="truncate">
                    <p className="text-[10px] text-zinc-600 font-medium">Position</p>
                    <p className="font-medium text-zinc-300 truncate">{interview.application?.job?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-950/30 border border-zinc-900 p-2 rounded-lg">
                  <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                  <div className="truncate">
                    <p className="text-[10px] text-zinc-600 font-medium">Interviewer</p>
                    <p className="font-medium text-zinc-300 truncate">{interview.interviewer}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}