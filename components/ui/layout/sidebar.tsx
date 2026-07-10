// components/layout/sidebar.tsx
import Link from "next/link";
import { LayoutDashboard, Briefcase, Users, Settings } from "lucide-react";

export default function Sidebar() {
  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/jobs", label: "Job Postings", icon: Briefcase },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 h-screen sticky top-0 flex flex-col p-4 space-y-6">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="h-6 w-6 rounded bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold text-xs">H</div>
        <span className="font-semibold text-zinc-50 tracking-tight text-sm">HireTrack</span>
      </div>
      <nav className="space-y-1 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors">
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}