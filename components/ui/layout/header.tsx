// components/layout/header.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="text-xs text-zinc-500 font-medium">Recruiter Portal</div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 font-mono bg-zinc-900 border border-zinc-850 px-2 py-1 rounded">
              {session.user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-zinc-400 hover:text-rose-400 h-8">
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}