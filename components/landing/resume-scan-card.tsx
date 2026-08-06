"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

const SKILLS = ["React", "Node.js", "4 yrs exp", "Team lead"];
const TARGET_SCORE = 92;
const CYCLE_MS = 5200;
const COUNT_END = 0.34; // fraction of cycle spent counting up
const HOLD_END = 0.82; // fraction of cycle the score stays put
// remainder eases back to 0 so the loop resets cleanly

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

export function ResumeScanCard() {
  const [score, setScore] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function frame(ts: number) {
      if (reduceMotion) {
        setScore(TARGET_SCORE);
        return;
      }
      if (startRef.current === null) startRef.current = ts;
      const elapsed = (ts - startRef.current) % CYCLE_MS;
      const p = elapsed / CYCLE_MS;

      let next: number;
      if (p < COUNT_END) {
        next = TARGET_SCORE * easeOutCubic(p / COUNT_END);
      } else if (p < HOLD_END) {
        next = TARGET_SCORE;
      } else {
        const fadeP = (p - HOLD_END) / (1 - HOLD_END);
        next = TARGET_SCORE * (1 - easeOutCubic(fadeP));
      }
      setScore(Math.round(next));
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ringDeg = Math.round((score / 100) * 360);

  return (
    <div className="brand-glow relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card">
      {/* file chrome */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">aman_samani_resume.pdf</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
          Gemini
        </span>
      </div>

      {/* scanning body */}
      <div className="relative overflow-hidden px-5 pt-5 pb-4">
        <div
          className="pointer-events-none absolute inset-x-0 h-14 bg-gradient-to-b from-primary/0 via-primary/25 to-primary/0 motion-reduce:hidden"
          style={{ animation: "scan-sweep 5.2s ease-in-out infinite" }}
          aria-hidden="true"
        />

        <div className="space-y-1.5">
          <div className="h-2.5 w-2/3 rounded-full bg-foreground/15" />
          <div className="h-2 w-1/3 rounded-full bg-foreground/10" />
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="h-2 w-full rounded-full bg-foreground/10" />
          <div className="h-2 w-5/6 rounded-full bg-foreground/10" />
          <div className="h-2 w-4/6 rounded-full bg-foreground/10" />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
          {SKILLS.map((skill, i) => (
            <span
              key={skill}
              className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary opacity-0 motion-reduce:opacity-100"
              style={{
                animation: "chip-in 5.2s ease-in-out infinite",
                animationDelay: `${0.4 + i * 0.32}s`,
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* score readout */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-background/40 px-5 py-4">
        <div>
          <p className="text-xs font-medium text-foreground">Match score</p>
          <p className="text-[11px] text-muted-foreground">vs. Senior Frontend Engineer</p>
        </div>
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) ${ringDeg}deg, var(--border) 0deg)` }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
            {score}%
          </div>
        </div>
      </div>
    </div>
  );
}