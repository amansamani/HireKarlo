"use client";

import { BriefcaseBusiness, Users, Building2, UserCheck, Star } from "lucide-react";

interface Avatar {
  initials: string;
  name: string;
  role: string;
  gradient: string;
  badge?: string;
  badgeColor?: string;
  delay?: string;
}

const avatars: Avatar[] = [
  { initials: "SK", name: "Sarah K.", role: "HR Director", gradient: "from-emerald-400 to-teal-600", badge: "Hiring", badgeColor: "bg-primary", delay: "0s" },
  { initials: "MR", name: "Marcus R.", role: "Agency CEO", gradient: "from-blue-400 to-indigo-600", badge: "Pro", badgeColor: "bg-blue-500", delay: "1.2s" },
  { initials: "LP", name: "Lisa P.", role: "Talent Scout", gradient: "from-purple-400 to-pink-600", badge: "Active", badgeColor: "bg-amber-500", delay: "2.4s" },
  { initials: "JT", name: "James T.", role: "Recruiter", gradient: "from-orange-400 to-red-600", badge: "Top", badgeColor: "bg-primary", delay: "0.8s" },
  { initials: "AN", name: "Aisha N.", role: "HR Manager", gradient: "from-rose-400 to-fuchsia-600", badge: "Verified", badgeColor: "bg-emerald-500", delay: "1.8s" },
];

export default function FloatingAvatars() {
  return (
    <div className="relative w-full h-full min-h-[420px] perspective-1000">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

      {avatars.map((avatar, i) => {
        const angle = (i / avatars.length) * 360;
        const radius = 120 + i * 15;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        const size = 72 - i * 4;
        return (
          <div key={avatar.initials} className="absolute top-1/2 left-1/2 group cursor-pointer"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`, animationDelay: avatar.delay, zIndex: avatars.length - i }}>
            <div className={`relative avatar-float-rotate rounded-full border-2 border-white/20 bg-gradient-to-br ${avatar.gradient} flex items-center justify-center font-bold text-white shadow-xl group-hover:scale-110 group-hover:border-white/50 transition-all duration-300`}
              style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(14, size / 4)}px`, animationDelay: avatar.delay }}
              title={`${avatar.name} — ${avatar.role}`}>
              <span className="drop-shadow-lg">{avatar.initials}</span>
              <span className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-green-400 border-2 border-[#0a0c09] shadow-lg" aria-hidden="true" />
              {avatar.badge && (
                <span className={`absolute -top-2 -right-3 ${avatar.badgeColor} text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full shadow-md border border-white/20`}>
                  {avatar.badge}
                </span>
              )}
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="glass-surface rounded-lg px-3 py-2 whitespace-nowrap shadow-2xl">
                  <p className="text-xs font-semibold">{avatar.name}</p>
                  <p className="text-[10px] text-muted-foreground">{avatar.role}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/30 glow-primary backdrop-blur-sm">
          <BriefcaseBusiness className="size-8 text-primary" strokeWidth={1.5} />
          <div className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl animate-pulse" aria-hidden="true" />
        </div>
      </div>

      <div className="absolute top-6 right-8 avatar-float" style={{ animationDelay: "0.5s" }}>
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-sm">
          <UserCheck className="size-3.5 text-primary" /><span className="text-[10px] font-medium">Hired</span>
        </div>
      </div>
      <div className="absolute bottom-12 left-4 avatar-float" style={{ animationDelay: "1.5s" }}>
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-sm">
          <Building2 className="size-3.5 text-primary" /><span className="text-[10px] font-medium">200+ Agencies</span>
        </div>
      </div>
      <div className="absolute top-16 left-8 avatar-float" style={{ animationDelay: "2s" }}>
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-sm">
          <Star className="size-3.5 text-amber-400" /><span className="text-[10px] font-medium">4.9/5</span>
        </div>
      </div>
      <div className="absolute bottom-6 right-12 avatar-float" style={{ animationDelay: "0.8s" }}>
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-sm">
          <Users className="size-3.5 text-primary" /><span className="text-[10px] font-medium">12k+ Users</span>
        </div>
      </div>
    </div>
  );
}