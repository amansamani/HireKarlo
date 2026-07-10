// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, ArrowUpRight, Users2, UserCheck, CalendarCheck2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRecruiterAnalyticsAction } from "@/actions/analytics";

type StatsData = {
  totalJobs: number;
  totalApplications: number;
  totalOffers: number;
  totalInterviews: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      const res = await getRecruiterAnalyticsAction();
      if (res.stats) setStats(res.stats);
      setLoading(false);
    }
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-zinc-400">Track key execution parameters across pipelines.</p>
        </div>
        <Link 
          href="/dashboard/jobs" 
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-100 px-4 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 transition-colors shadow-sm gap-1.5"
        >
          Manage Jobs <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          Compiling platform statistics metrics...
        </div>
      ) : (

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/40 border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-400" /> Total Postings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight">{stats?.totalJobs || 0}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Live open job board paths</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                <Users2 className="h-4 w-4 text-purple-400" /> Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white  tracking-tight">{stats?.totalApplications || 0}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Incoming candidates inside database</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-amber-400" /> Active Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight">{stats?.totalInterviews || 0}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Candidates in Tech or HR round stages</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" /> Extended Offers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white tracking-tight">{stats?.totalOffers || 0}</div>
              <p className="text-[10px] text-zinc-500 mt-1">Successful offers drafted</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}