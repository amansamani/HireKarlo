"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Menu, LogOut, Bell, Settings, Calendar, CalendarOff, FileText, Video,
  Loader2, Users2, ExternalLink, Pencil, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { getNotificationsAction } from "@/actions/analytics";
import {
  getTeamAction,
  updateMyBioAction,
  disconnectGoogleCalendarAction,
} from "@/actions/team";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/candidates": "Candidates",
  "/dashboard/jobs": "Jobs",
  "/dashboard/jobs/create": "Create Job",
  "/dashboard/interviews": "Interviews",
  "/dashboard/team": "Team",
};

function getPageTitle(pathname: string) {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];
  if (/^\/dashboard\/jobs\/[^/]+$/.test(pathname)) return "Job Pipeline";
  return "Dashboard";
}

/* ── helpers ── */
function timeAgo(d: string | Date) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function timeUntil(d: string | Date) {
  const mins = Math.floor((new Date(d).getTime() - Date.now()) / 60000);
  if (mins < 60) return `in ${Math.max(mins, 1)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}
// Kept outside the component so the Date.now() read isn't an impure call
// inside render (per react-hooks/purity).
function isFutureDate(d: string | Date) {
  return +new Date(d) > Date.now();
}

function useClickOutside(onOut: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onOut]);
  return ref;
}

type Notif = {
  id: string;
  type: "application" | "interview";
  title: string;
  meta: string;
  at: Date | string;
};

/* ── 🔔 Notification bell ── */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const res = await getNotificationsAction();
      setLoading(false);
      const list = (res.notifications ?? []) as Notif[];
      setItems(list);
      const seen = localStorage.getItem("hk-notif-seen");
      setUnread(seen ? list.filter((n) => +new Date(n.at) > +new Date(seen)).length : list.length);
    })();
  }, [open]);

  function handleClose() {
    localStorage.setItem("hk-notif-seen", new Date().toISOString());
    setUnread(0);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="relative rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <span className="text-[10px] text-muted-foreground">last 7 days</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
                You&apos;re all caught up 🎉
              </div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="flex items-start gap-3 border-b border-border/20 px-4 py-3 transition-colors hover:bg-muted/30">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    n.type === "application" ? "bg-primary/10" : "bg-warning/10")}>
                    {n.type === "application"
                      ? <FileText className="h-4 w-4 text-primary" />
                      : <Video className="h-4 w-4 text-warning" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground">{n.meta}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                    {n.type === "interview" && isFutureDate(n.at) ? timeUntil(n.at) : timeAgo(n.at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ⚙️ Settings menu ── */
function SettingsMenu({
  bio,
  calendarEmail,
  onChanged,
}: {
  bio: string;
  calendarEmail: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState(bio);
  const [busy, setBusy] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  async function saveBio() {
    setBusy("bio");
    const res = await updateMyBioAction(bioText);
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Bio updated.");
      setEditingBio(false);
      onChanged();
    }
  }

  async function disconnect() {
    setBusy("cal");
    const res = await disconnectGoogleCalendarAction();
    setBusy(null);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(res.success ?? "Calendar disconnected.");
      onChanged();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Settings"
      >
        <Settings className="h-4.5 w-4.5" aria-hidden="true" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-border/40 px-4 py-3">
            <p className="text-sm font-bold">Settings</p>
          </div>

          <div className="space-y-4 p-4">
            {/* Bio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Pencil className="h-3 w-3" /> Your bio
                </p>
                {!editingBio && (
                  <button
                    type="button"
                    onClick={() => { setBioText(bio); setEditingBio(true); }}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    rows={3}
                    maxLength={240}
                    placeholder="Tell your team a little about yourself…"
                    className="w-full resize-none rounded-xl border border-border/60 bg-background/50 p-3 text-xs focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={saveBio} disabled={busy === "bio"} className="h-7 flex-1 rounded-lg text-[11px]">
                      {busy === "bio" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingBio(false)} className="h-7 rounded-lg text-[11px]">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                  {bio || "No bio yet — add one so teammates know who they're working with."}
                </p>
              )}
            </div>

            {/* Google Calendar */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Calendar className="h-3 w-3" /> Google Calendar
              </p>

              {calendarEmail ? (
                <div className="flex items-center justify-between rounded-xl border border-success/20 bg-success/5 px-3 py-2.5">
                  <span className="truncate font-mono text-[11px] text-success">{calendarEmail}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={disconnect}
                    disabled={busy === "cal"}
                    className="h-7 shrink-0 rounded-lg text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    {busy === "cal" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarOff className="h-3 w-3" />} Disconnect
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { window.location.href = "/api/auth/google-calendar/connect"; }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <Calendar className="h-3.5 w-3.5" /> Connect Google Calendar
                </button>
              )}

              <p className="text-[10px] text-muted-foreground">
                Connecting enables auto Google Meet links & calendar invites on interviews.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 👤 Profile / avatar menu ── */
function ProfileMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-foreground select-none shadow-sm transition-transform hover:scale-105"
        aria-label="Open profile menu"
      >
        {(name || email || "H")[0]?.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-border/40 px-4 py-3">
            <p className="truncate text-sm font-bold">{name || "Team member"}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{email}</p>
            {role && (
              <span className="mt-1.5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {role}
              </span>
            )}
          </div>
          <div className="p-2">
            <Link href="/dashboard/team" onClick={close}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
              <Users2 className="h-4 w-4" /> View team
            </Link>
            <Link href="/" onClick={close}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
              <ExternalLink className="h-4 w-4" /> Back to website
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main header ── */
export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const pageTitle = getPageTitle(pathname);

  const [role, setRole] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [teamVersion, setTeamVersion] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await getTeamAction();
      if (res && !("error" in res && res.error)) {
        setRole((res as { currentRole?: string }).currentRole ?? null);
        setCalendarEmail((res as { googleCalendarEmail?: string | null }).googleCalendarEmail ?? null);
        const me = (res.members ?? []).find(
          (m: { userId: string | null }) => m.userId === (res as { currentUserId?: string }).currentUserId
        );
        setBio(me?.user?.bio ?? "");
      }
    })();
  }, [teamVersion]);

  const refreshTeam = useCallback(() => setTeamVersion((v) => v + 1), []);

  return (
      <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Image src="/logo.webp" alt="HireKarlo Logo" width={96} height={24} className="h-6 w-auto object-contain md:hidden" priority />
        <h1 className="hidden text-lg font-semibold tracking-tight sm:block sm:text-xl">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <NotificationBell />
        <SettingsMenu bio={bio} calendarEmail={calendarEmail} onChanged={refreshTeam} />
        <ProfileMenu
          name={session?.user?.name ?? ""}
          email={session?.user?.email ?? ""}
          role={role}
        />
      </div>
    </header>
  );
}