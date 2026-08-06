"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  ShieldCheck,
  UserPlus,
  Loader2,
  Trash2,
  Clock,
  Crown,
  UserCheck,
  Mic,
  Users2,
  Star,
  Lock,
} from "lucide-react";

import { getTeamAction, inviteTeamMemberAction, removeMemberAction } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ✅ Mirrors lib/roles.ts canManageTeam — only OWNER + ADMIN can modify the team
function canManage(role: string | null | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

type Member = {
  id: string;
  userId: string | null;
  role: string;
  user: { email: string; name: string | null; bio: string | null } | null;
  interviewerStats: { avg: number; count: number } | null;
};
type Invite = { id: string; email: string; role: string; createdAt: Date | string };

const ROLE_META: Record<string, { icon: typeof Crown; tone: string }> = {
  OWNER:       { icon: Crown,       tone: "text-warning bg-warning/10 border-warning/30" },
  ADMIN:       { icon: ShieldCheck, tone: "text-primary bg-primary/10 border-primary/30" },
  RECRUITER:   { icon: UserCheck,   tone: "text-chart-2 bg-chart-2/10 border-chart-2/30" },
  INTERVIEWER: { icon: Mic,         tone: "text-success bg-success/10 border-success/30" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"RECRUITER" | "INTERVIEWER">("INTERVIEWER");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getTeamAction();
      if (res && !("error" in res && res.error)) {
        setMembers(res.members ?? []);
        setInvites(res.invites ?? []);
        setCurrentRole((res as { currentRole?: string }).currentRole ?? null);
        setCurrentUserId((res as { currentUserId?: string }).currentUserId ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function invite() {
    if (!email.trim()) return toast.error("Enter an email address.");
    setBusy("invite");
    const res = await inviteTeamMemberAction({ email: email.trim(), role });
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(`Invite sent to ${email.trim()}.`);
      setInvites((c) => [
        { id: crypto.randomUUID(), email: email.trim(), role, createdAt: new Date() },
        ...c,
      ]);
      setEmail("");
    }
  }

  async function remove(id: string) {
    setBusy(id);
    const res = await removeMemberAction(id);
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else {
      setMembers((c) => c.filter((m) => m.id !== id));
      toast.success("Member removed.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = canManage(currentRole);

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Invite recruiters and interviewers — everyone sees only what their role allows."
            : "View your teammates and their interview ratings."}
        </p>
      </div>

      {/* ✅ Invite card — ONLY for OWNER / ADMIN */}
      {isAdmin ? (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Invite a teammate
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 rounded-xl border-border/60 bg-background/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(["INTERVIEWER", "RECRUITER"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-12 rounded-xl border px-4 text-xs font-semibold transition-all",
                    role === r
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/40 bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <Button
              onClick={invite}
              disabled={busy === "invite"}
              className="h-12 rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              {busy === "invite" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send invite
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/30 px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Read-only view:</span> only owners and
            admins can invite or remove team members.
          </p>
        </div>
      )}

      {/* Members grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m, i) => {
          const meta = ROLE_META[m.role] ?? ROLE_META.RECRUITER;
          const Icon = meta.icon;
          const name = m.user?.name || "—";
          const emailAddr = m.user?.email || "—";
          return (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-base font-bold">
                  {name[0]?.toUpperCase() || emailAddr[0]?.toUpperCase()}
                </div>
                <span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", meta.tone)}>
                  <Icon className="h-3 w-3" /> {m.role}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold truncate">{name}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{emailAddr}</p>

              {m.interviewerStats && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/5 px-2.5 py-1.5">
                  <Star className="h-3 w-3 text-warning" />
                  <span className="text-[10px] font-semibold text-foreground">
                    {m.interviewerStats.avg.toFixed(1)} avg rating
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {m.interviewerStats.count} rounds
                  </span>
                </div>
              )}

              {/* ✅ Delete only when: (a) current user is OWNER/ADMIN,
                     (b) target isn't the OWNER,
                     (c) target isn't the current user themselves */}
              {isAdmin && m.role !== "OWNER" && m.userId !== currentUserId && (
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  disabled={busy === m.id}
                  className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label={`Remove ${emailAddr}`}
                >
                  {busy === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invites — only admins see the list */}
      {isAdmin && invites.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Clock className="h-4 w-4" /> Pending invites
          </h3>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-mono text-xs font-medium">{inv.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Invited as {inv.role.toLowerCase()} ·{" "}
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
          <Users2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No team members yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin ? "Send your first invite above." : "Ask your team owner to invite you."}
          </p>
        </div>
      )}
    </div>
  );
}