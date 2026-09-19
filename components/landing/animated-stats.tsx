"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, Users, BriefcaseBusiness, Star } from "lucide-react";

interface Stat { icon: typeof TrendingUp; value: number; suffix: string; label: string; description: string; }

const stats: Stat[] = [
  { icon: Users, value: 12400, suffix: "+", label: "Recruiters", description: "Active hiring teams worldwide" },
  { icon: BriefcaseBusiness, value: 890, suffix: "+", label: "Agencies", description: "Recruitment firms trust us" },
  { icon: TrendingUp, value: 320000, suffix: "+", label: "Hires made", description: "Successful placements tracked" },
  { icon: Star, value: 98, suffix: "%", label: "Satisfaction", description: "Client renewal rate" },
];

function AnimatedNumber({ target, suffix, duration = 2000 }: { target: number; suffix: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !started) setStarted(true); }, { threshold: 0.3 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);

  const formatted = display >= 1000 ? display.toLocaleString() : display.toString();
  return <span ref={ref} className="tabular-nums">{formatted}{suffix}</span>;
}

export default function AnimatedStats() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" aria-hidden="true" />
      <div className="marketing-section">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map(({ icon: Icon, value, suffix, label, description }, index) => (
            <div key={label} className="scroll-reveal perspective-1000" style={{ transitionDelay: `${index * 100}ms` }}>
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-primary/30 transition-all duration-300" data-tilt="4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">0{index + 1}</span>
                </div>
                <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient mb-2">
                  <AnimatedNumber target={value} suffix={suffix} />
                </div>
                <h3 className="font-display text-base font-semibold mb-1">{label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                  <div className="absolute inset-y-0 -inset-x-full w-1/2 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-12 group-hover:translate-x-[200%] transition-transform duration-1000" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}