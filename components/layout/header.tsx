"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const segment = pathname.split("/")[1] || "Dashboard";
  const pageTitle = segment.charAt(0).toUpperCase() + segment.slice(1);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-8 text-zinc-100">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <span className="text-xs text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
              {session.user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-zinc-400 hover:text-rose-400 h-8"
            >
              Sign out
            </Button>
          </>
        )}
        <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 select-none">
          {session?.user?.email?.[0]?.toUpperCase() || "HR"}
        </div>
      </div>
    </header>
  );
}