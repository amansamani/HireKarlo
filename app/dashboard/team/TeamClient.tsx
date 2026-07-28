"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Loader2, Trash2, Mail, Shield, Pencil, Star, Calendar, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteTeamMemberAction, removeMemberAction, updateMyBioAction, disconnectGoogleCalendarAction } from "@/actions/team";
import { canManageTeam } from "@/lib/roles";

type Member = {
  id: string;
  role: string;
  userId: string;
  user: { name: string | null; email: string; bio: string | null };
  interviewerStats: { avg: number; count: number } | null;
};
type Invite = { id: string; email: string; role: string; createdAt: Date | string };

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Only owners and admins can manage the calendar connection.",
  denied: "Google sign-in was cancelled.",
  no_refresh_token: "Already connected once before — remove HireKarlo's access at myaccount.google.com/permissions, then reconnect.",
  failed: "Couldn't connect Google Calendar. Try again.",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner", ADMIN: "Admin", RECRUITER: "Recruiter", INTERVIEWER: "Interviewer",
};

// Isolated in its own component + Suspense boundary since useSearchParams()
// requires one during prerender — kept separate so it can't block the rest
// of the page from rendering while resolving.
function GoogleCalendarStatusToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const err = searchParams.get("googleError");
    const connected = searchParams.get("googleConnected");
    if (err) {
      toast.error(GOOGLE_ERROR_MESSAGES[err] ?? "Couldn't connect Google Calendar.");
      router.replace("/dashboard/team");
    } else if (connected) {
      toast.success("Google Calendar connected!");
      router.replace("/dashboard/team");
    }
  }, [searchParams, router]);

  return null;
}

export default function TeamClient({
  initialMembers,
  initialInvites,
  currentUserId,
  currentRole,
  googleCalendarEmail,
}: {
  initialMembers: Member[];
  initialInvites: Invite[];
  currentUserId: string;
  currentRole: string;
  googleCalendarEmail: string | null;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "RECRUITER" | "INTERVIEWER">("RECRUITER");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState(googleCalendarEmail);
  const [disconnecting, setDisconnecting] = useState(false);
  const canManage = canManageTeam(currentRole);

  const handleDisconnectCalendar = useCallback(async () => {
    setDisconnecting(true);
    const res = await disconnectGoogleCalendarAction();
    setDisconnecting(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setCalendarEmail(null);
      toast.success("Disconnected.");
    }
  }, []);

  const handleSaveBio = useCallback(async () => {
    setSavingBio(true);
    const res = await updateMyBioAction(bioDraft);
    setSavingBio(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setMembers((current) =>
        current.map((m) => (m.userId === currentUserId ? { ...m, user: { ...m.user, bio: bioDraft.trim() || null } } : m))
      );
      setEditingBio(false);
    }
  }, [bioDraft, currentUserId]);

  const handleInvite = useCallback(async () => {
    if (!email.includes("@")) {
      toast.error("Enter a valid email.");
      return;
    }
    setInviting(true);
    const res = await inviteTeamMemberAction({ email, role });
    setInviting(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Invite sent.");
      setInvites((current) => [{ id: crypto.randomUUID(), email, role, createdAt: new Date() }, ...current]);
      setEmail("");
    }
  }, [email, role]);

  const handleRemove = useCallback(async (member: Member) => {
    setRemovingId(member.id);
    const res = await removeMemberAction(member.id);
    setRemovingId(null);
    if (res.error) {
      toast.error(res.error);
    } else {
      setMembers((current) => current.filter((m) => m.id !== member.id));
      toast.success("Member removed.");
    }
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Suspense fallback={null}>
        <GoogleCalendarStatusToast />
      </Suspense>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team</h2>
        <p className="text-sm text-muted-foreground">Everyone here shares the same job postings and candidate pool.</p>
      </div>

      {canManage && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite a teammate
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "RECRUITER" | "INTERVIEWER")}
              className="rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="ADMIN">Admin</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="INTERVIEWER">Interviewer</option>
            </select>
            <Button onClick={handleInvite} disabled={inviting} className="gap-1.5 text-xs font-semibold">
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
              Send Invite
            </Button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                {calendarEmail
                  ? `Connected as ${calendarEmail} — interviews get an auto Meet link.`
                  : "Connect once to auto-generate a Meet link on every scheduled interview."}
              </p>
            </div>
          </div>
          {calendarEmail ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              onClick={handleDisconnectCalendar}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Unlink className="h-3.5 w-3.5" aria-hidden="true" />}
              Disconnect
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 text-xs font-semibold" onClick={() => { window.location.href = "/api/auth/google-calendar/connect"; }}>
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Connect
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members ({members.length})</h3>
        {members.map((member) => (
          <div key={member.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.user.name ?? member.user.email}
                  {member.userId === currentUserId && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {member.interviewerStats && (
                  <span className="flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    {member.interviewerStats.avg.toFixed(1)} ({member.interviewerStats.count})
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Shield className="h-3 w-3" aria-hidden="true" /> {ROLE_LABELS[member.role] ?? member.role}
                </span>
                {canManage && member.role !== "OWNER" && member.userId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member)}
                    disabled={removingId === member.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remove ${member.user.email}`}
                  >
                    {removingId === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                )}
              </div>
            </div>

            {member.userId === currentUserId ? (
              editingBio ? (
                <div className="mt-2 flex gap-1.5">
                  <Input
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="e.g., Senior DevOps, 8 yrs, freelance interviewer"
                    maxLength={240}
                    className="flex-1 text-xs"
                    autoFocus
                  />
                  <Button size="sm" className="text-xs" disabled={savingBio} onClick={handleSaveBio}>
                    {savingBio && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />} Save
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingBio(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBioDraft(member.user.bio ?? "");
                    setEditingBio(true);
                  }}
                  className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  {member.user.bio || "Add a short bio"}
                </button>
              )
            ) : (
              member.user.bio && <p className="mt-1.5 text-xs text-muted-foreground">{member.user.bio}</p>
            )}
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending invites ({invites.length})</h3>
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-lg border border-dashed border-border bg-card/50 p-3">
              <p className="text-sm text-foreground">{invite.email}</p>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {ROLE_LABELS[invite.role] ?? invite.role} · pending
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}