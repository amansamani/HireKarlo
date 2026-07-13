"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/candidates": "Candidates",
  "/dashboard/jobs": "Jobs",
  "/dashboard/jobs/create": "Create Job",
  "/dashboard/interviews": "Interviews",
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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <span className="hidden rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground sm:inline-block">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground select-none"
          aria-hidden="true"
        >
          {session?.user?.email?.[0]?.toUpperCase() || "HR"}
        </div>
      </div>
    </header>
  );
}