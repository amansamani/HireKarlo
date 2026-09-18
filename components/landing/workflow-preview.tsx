"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Circle, SlidersHorizontal, Sparkles } from "lucide-react";

const stages = [
  { name: "Applied", detail: "Every application, in one place.", description: "Collect candidate details and resumes through a public job link. Your team starts with the same information.", people: [["AS", "Aanya Shah", "Product designer", "Portfolio received"], ["RK", "Rohan Kapoor", "Frontend engineer", "Resume received"], ["MP", "Mira Patel", "Product designer", "New application"]] },
  { name: "Review", detail: "A clearer shortlist. Your judgment.", description: "Review experience alongside AI screening insights when configured. Scores support your team; they never make the hiring decision.", people: [["AS", "Aanya Shah", "Product designer", "Ready for review"], ["RK", "Rohan Kapoor", "Frontend engineer", "Skills reviewed"]] },
  { name: "Interview", detail: "Give every conversation context.", description: "Schedule rounds, assign interviewers and bring structured feedback back to the candidate’s record.", people: [["AS", "Aanya Shah", "Product designer", "Design conversation"], ["RK", "Rohan Kapoor", "Frontend engineer", "Technical round"]] },
  { name: "Decision", detail: "Close the loop with confidence.", description: "Move candidates through your pipeline with the application history and interview feedback together in one workspace.", people: [["AS", "Aanya Shah", "Product designer", "Offer stage"]] },
];

export default function WorkflowPreview() {
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];
  return <div data-spotlight className="workflow-frame premium-panel overflow-hidden rounded-2xl sm:rounded-3xl">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
      <div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">h.</span><span className="text-sm font-medium">The hiring workspace</span></div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">Sample data</span>
    </div>
    <div className="grid lg:grid-cols-[210px_1fr]">
      <div className="hidden border-r border-white/10 bg-black/10 p-5 lg:block">
        <p className="mb-5 text-[10px] uppercase tracking-[.2em] text-muted-foreground">Acme studio · example</p>
        {["Overview", "Candidates", "Job pipeline", "Interviews", "Team"].map(item => <div key={item} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-xs ${item === "Job pipeline" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><Circle className="size-3"/>{item}</div>)}
        <div className="mt-12 rounded-xl border border-white/10 p-3"><Sparkles className="mb-3 size-4 text-primary"/><p className="text-xs leading-relaxed text-muted-foreground">A thoughtful process.<br/>A human decision.</p></div>
      </div>
      <div className="min-w-0 p-5 sm:p-7">
        <div className="mb-7 flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] uppercase tracking-[.18em] text-muted-foreground">Design & engineering</p><h3 className="text-xl font-medium tracking-tight">Good people. Clear next steps.</h3></div><SlidersHorizontal className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true"/></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Explore hiring stages">
          {stages.map((item, i) => <button key={item.name} onClick={() => setSelected(i)} aria-pressed={i === selected} className={`workflow-tab flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-xs transition-colors ${i === selected ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:bg-white/5"}`}><span><span className="mr-2 opacity-60">0{i + 1}</span>{item.name}</span><ChevronRight className="size-3" aria-hidden="true"/></button>)}
        </div>
        <div className="workflow-progress mt-4 grid grid-cols-4 gap-2" aria-hidden="true">{stages.map((item, i) => <span key={item.name}><span style={{ transform: `scaleX(${i <= selected ? 1 : 0})` }}/></span>)}</div>
        <div aria-live="polite" className="mt-5 grid gap-4 sm:min-h-64 sm:grid-cols-[1.2fr_1fr]">
          <div key={`people-${selected}`} className="min-h-[338px] space-y-2">{stage.people.map(([initials, name, role, status], index) => <div key={name} style={{ animationDelay: `${index * 65}ms` }} className="workflow-person rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d5d6be] text-[11px] font-semibold text-[#30352a]">{initials}</span><div><p className="text-sm font-medium">{name}</p><p className="mt-1 text-[11px] text-muted-foreground">{role}</p></div><ArrowUpRight className="ml-auto size-4 text-muted-foreground" aria-hidden="true"/></div><div className="mt-3 flex items-center gap-1.5 text-[10px] text-primary/80"><Check className="size-3" aria-hidden="true"/>{status}</div></div>)}</div>
          <div key={`detail-${selected}`} className="workflow-description flex flex-col justify-between rounded-xl border border-primary/15 bg-primary/[.045] p-5"><span className="eyebrow">0{selected + 1} / The workflow</span><div className="mt-6"><h4 className="text-lg font-medium tracking-tight">{stage.detail}</h4><p className="mt-3 text-xs leading-6 text-muted-foreground">{stage.description}</p></div><p className="mt-5 text-[10px] text-muted-foreground">Interactive preview · fictional records</p></div>
        </div>
      </div>
    </div>
  </div>;
}
