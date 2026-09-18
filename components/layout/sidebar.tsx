"use client";

import { useEffect, useRef } from "react";
import { NavigationFeedback } from "@/components/ui/navigation-feedback";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CalendarClock,
  Users2,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { canEditPipeline, canManageTeam } from "@/lib/roles";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/interviews", label: "Interviews", icon: CalendarClock },
  { href: "/dashboard/team", label: "Team", icon: Users2 },
  { href: "/dashboard/clients", label: "Agency clients", icon: Briefcase },
  { href: "/dashboard/billing", label: "Billing & usage", icon: Sparkles },
  { href: "/dashboard/settings", label: "Workspaces", icon: Users2 },
];

export default function Sidebar({
  mobileOpen,
  onClose,
  role,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  role: string | null;
}) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = sidebarRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []).filter(el => el.getClientRects().length);
    focusables()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || window.matchMedia("(min-width: 768px)").matches) return;
      const items = focusables(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [mobileOpen, onClose]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-border/40 bg-gradient-to-b from-background via-background to-background/95 transition-transform duration-300 ease-out",
          "md:static md:visible md:z-auto md:h-dvh md:translate-x-0",
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border/40">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group"
            onClick={onClose}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image
                src="/logo.webp"
                alt="HireKarlo Logo"
                width={112}
                height={28}
                className="relative h-7 w-auto object-contain"
                priority
              />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              HireKarlo
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-6 space-y-1" aria-label="Main navigation">
          <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Navigation
          </p>
          {links.filter(link => {
            if (link.href === "/dashboard/billing") return canManageTeam(role ?? "");
            if (["/dashboard/candidates", "/dashboard/jobs", "/dashboard/clients"].includes(link.href)) return canEditPipeline(role ?? "");
            return true;
          }).map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{link.label}</span><NavigationFeedback />
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-primary/60" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom card */}
        <div className="px-4 pb-5">
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-card to-card p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  People first. AI assisted.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Organize your shortlist. Keep every hiring decision in human hands.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
