"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Briefcase, Users, ArrowRight, Loader2, Plus } from "lucide-react";
import { getAllJobsAction } from "@/actions/jobs-pool";
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

export default function JobsPoolPage() {
  const [jobs, setJobs] = useState<GlobalJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      const res = await getAllJobsAction();
      if (res.jobs) setJobs(res.jobs as any);
      setLoading(false);
    }
    loadJobs();
  }, []);

  return (
    <div className="space-y-6 text-zinc-100 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Job Openings</h2>
          <p className="text-sm text-zinc-400">Manage your active listings and review incoming pipeline volumes.</p>
        </div>
        <Link href="/dashboard/jobs/create">
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-semibold gap-1.5 h-9">
            <Plus className="h-4 w-4" /> Create Position
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          Loading job configurations...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
          <Briefcase className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No positions created yet</p>
          <p className="text-xs text-zinc-600 mt-1">Add your first role to start collecting public resumes.</p>
        </div>
      ) : (
        /* Jobs List Cards Container */
        <div className="grid grid-cols-1 gap-3.5">
          {jobs.map((job) => (
            <div key={job.id} className="border border-zinc-850 bg-zinc-900/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700/80 transition-all shadow-sm group">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-zinc-200 text-sm group-hover:text-zinc-100 transition-colors">{job.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                    job.status === "ACTIVE" || job.status === "OPEN" 
                      ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/60" 
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {job.status.toLowerCase()}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span className="text-zinc-400 font-medium">{job.department}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.type}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 border-zinc-900 pt-3 sm:pt-0">
                <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950/40 border border-zinc-900 px-3 py-1.5 rounded-lg select-none">
                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-200">{job._count.applications}</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Applicants</span>
                </div>

                <Link href="/dashboard/jobs/create">
                  <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 text-xs font-semibold gap-1.5 h-9">
                      <Plus className="h-4 w-4" /> Create Position
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