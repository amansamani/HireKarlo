"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="skip-link rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
        Skip to content
      </a>

      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 selection:bg-primary/20 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}