import Link from "next/link";
import {
  Briefcase,
  ArrowUpRight,
  Users2,
  UserCheck,
  CalendarCheck2,
  Trophy,
  TrendingUp,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import { getRecruiterAnalyticsAction } from "@/actions/analytics";
import { getTeamAction } from "@/actions/team";

type StatsData = {
  totalJobs: number;
  totalApplications: number;
  totalOffers: number;
  totalInterviews: number;
  totalHired: number;
};

const STAT_DEFS = [
  {
    key: "totalJobs",
    label: "Total Postings",
    hint: "Live open job board paths",
    icon: Briefcase,
    tone: "text-chart-2 bg-chart-2/10",
    gradient: "from-chart-2/20 to-chart-2/5",
  },
  {
    key: "totalApplications",
    label: "Total Applications",
    hint: "Incoming candidates in database",
    icon: Users2,
    tone: "text-primary bg-primary/10",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    key: "totalInterviews",
    label: "Active Interviews",
    hint: "Candidates in Tech or HR rounds",
    icon: CalendarCheck2,
    tone: "text-warning bg-warning/10",
    gradient: "from-warning/20 to-warning/5",
  },
  {
    key: "totalOffers",
    label: "Extended Offers",
    hint: "Successful offers drafted",
    icon: UserCheck,
    tone: "text-success bg-success/10",
    gradient: "from-success/20 to-success/5",
  },
  {
    key: "totalHired",
    label: "Total Hired",
    hint: "Candidates who accepted a role",
    icon: Trophy,
    tone: "text-chart-4 bg-chart-4/10",
    gradient: "from-chart-4/20 to-chart-4/5",
  },
] as const;

// ✅ Mirrors lib/roles.ts canEditPipeline — interviewers can't create jobs
function canCreateJob(role: string | null | undefined): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "RECRUITER";
}

export default async function DashboardPage() {
  const [res, teamRes] = await Promise.all([
    getRecruiterAnalyticsAction(),
    getTeamAction(),
  ]);

  const role = (teamRes as { currentRole?: string }).currentRole ?? null;
  const isCreator = canCreateJob(role);

  const stats: StatsData = res.stats || {
    totalJobs: 0,
    totalApplications: 0,
    totalOffers: 0,
    totalInterviews: 0,
    totalHired: 0,
  };

  const totalApps = stats.totalApplications || 0;
  const totalHired = stats.totalHired || 0;
  const conversionRate = totalApps > 0 ? ((totalHired / totalApps) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track key pipeline metrics and manage your hiring workflow.
          </p>
        </div>
        {/* ✅ "Manage Jobs" only for roles that can edit the pipeline */}
        {isCreator && (
          <Link
            href="/dashboard/jobs"
            className="group inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.02]"
          >
            Manage Jobs
            <ArrowUpRight
              className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAT_DEFS.map((def, i) => {
          const Icon = def.icon;
          const value = stats[def.key];
          return (
            <div
              key={def.key}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${def.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${def.tone} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{def.label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{def.hint}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ✅ Quick actions adapt to role */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isCreator
                ? "Common tasks you can perform right now"
                : "Your workspace as an interviewer"}
            </p>
            <div className="space-y-2">
              {/* ✅ Create job — ONLY for OWNER / ADMIN / RECRUITER */}
              {isCreator && (
                <Link
                  href="/dashboard/jobs/create"
                  className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <span>Create new job posting</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              {/* ✅ Interviewers get their own relevant shortcut instead */}
              {!isCreator && (
                <Link
                  href="/dashboard/interviews"
                  className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-foreground hover:bg-warning/10 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                    <CalendarClock className="h-4 w-4 text-warning" />
                  </div>
                  <span>My assigned interviews</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              <Link
                href="/dashboard/candidates"
                className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                  <Users2 className="h-4 w-4 text-chart-2" />
                </div>
                <span>View all candidates</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>

        {/* Pipeline Health */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-success/5 via-card to-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-success/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-success/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h3 className="text-lg font-semibold mb-2">Pipeline Health</h3>
            <p className="text-sm text-muted-foreground mb-4">Your hiring funnel at a glance</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Applications</span>
                <span className="text-sm font-bold text-foreground">{stats.totalApplications}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Interviews</span>
                <span className="text-sm font-bold text-foreground">{stats.totalInterviews}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Offers</span>
                <span className="text-sm font-bold text-foreground">{stats.totalOffers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Hired</span>
                <span className="text-sm font-bold text-success">{stats.totalHired}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-warning/5 via-card to-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-warning/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-warning/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h3 className="text-lg font-semibold mb-2">Conversion Rate</h3>
            <p className="text-sm text-muted-foreground mb-4">Application to hire ratio</p>
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-2">of applications become hires</p>
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-warning to-success rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(parseFloat(conversionRate), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}