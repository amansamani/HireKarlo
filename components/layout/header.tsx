"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 md:hidden">
          <Image
            src="/logo.webp"
            alt="HireKarlo Logo"
            width={96}
            height={24}
            className="h-6 w-auto object-contain"
            priority
          />
        </div>

        <div className="hidden sm:block">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-xl"
          aria-label="Settings"
        >
          <Settings className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>

        {/* User email */}
        {session?.user?.email && (
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-1.5">
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
              {session.user.email}
            </span>
          </div>
        )}

        {/* Sign out */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-xl"
          aria-label="Sign out"
        >
          <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>

        {/* Avatar */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-foreground select-none shadow-sm"
          aria-hidden="true"
        >
          {session?.user?.email?.[0]?.toUpperCase() || "HR"}
        </div>
      </div>
    </header>
  );
}