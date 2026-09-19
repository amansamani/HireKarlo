import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { editCandidateAction } from "@/actions/edit-records";

const input = "mt-2 block w-full rounded-lg border border-border bg-background p-3";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?";
}

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) notFound();
  const { id } = await params;
  const candidate = await prisma.candidate.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      applications: {
        select: { id: true, stage: true, appliedDate: true, matchScore: true, job: { select: { id: true, title: true } } },
        orderBy: { appliedDate: "desc" },
        take: 100,
      },
    },
  });
  if (!candidate) notFound();
  const query = await searchParams;

  return (
    <section className="mx-auto max-w-3xl space-y-8 p-6">
      <Link href="/dashboard/candidates" className="text-sm text-muted-foreground hover:text-foreground">← Candidates</Link>

      {/* Profile header */}
      <div className="flex flex-col gap-5 rounded-2xl border border-border/40 bg-card p-6 shadow-sm sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xl font-bold text-primary" aria-hidden="true">
          {initials(candidate.fullName)}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{candidate.fullName}</h1>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><Mail className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Email</dt><dd><a className="hover:text-foreground hover:underline" href={`mailto:${candidate.email}`}>{candidate.email}</a></dd></div>
            {candidate.phone && <div className="flex items-center gap-1.5"><Phone className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Phone</dt><dd>{candidate.phone}</dd></div>}
            {candidate.currentCompany && <div className="flex items-center gap-1.5"><Building2 className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Current company</dt><dd>{candidate.currentCompany}</dd></div>}
            <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Experience</dt><dd>{candidate.experience} yr{candidate.experience === 1 ? "" : "s"} experience</dd></div>
          </dl>
          {candidate.skills.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
              {candidate.skills.map(skill => <li key={skill} className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-medium">{skill}</li>)}
            </ul>
          )}
          {candidate.resumeUrl && (
            <a href={`/api/resumes/${candidate.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium hover:bg-muted/50">
              <FileText className="h-4 w-4" aria-hidden="true" /> View resume
            </a>
          )}
        </div>
      </div>

      {/* Applications */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Applications</h2>
        {candidate.applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <ul className="divide-y divide-border/40 rounded-2xl border border-border/40 bg-card">
            {candidate.applications.map(a => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <Link className="font-medium underline-offset-4 hover:text-primary hover:underline" href={`/dashboard/jobs/${a.job.id}`}>{a.job.title}</Link>
                  <p className="text-xs text-muted-foreground">Applied {a.appliedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.matchScore !== null && <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-semibold">{a.matchScore}% match</span>}
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{a.stage}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit details (unchanged behaviour) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Edit details</h2>
        {query.error && <p role="alert">Could not save. Check the fields and your active plan.</p>}
        {query.saved && <p role="status">Profile saved.</p>}
        <form action={editCandidateAction} className="space-y-5">
          <input name="id" type="hidden" value={id} />
          {([
            ["fullName", "Full name", candidate.fullName, 120],
            ["phone", "Phone", candidate.phone ?? "", 50],
            ["currentCompany", "Current company", candidate.currentCompany ?? "", 150],
            ["skills", "Skills, separated by commas", candidate.skills.join(", "), 3000],
          ] as const).map(([name, label, value, max]) => (
            <label className="block" key={name}>
              {label}
              <input className={input} name={name} defaultValue={value} maxLength={max} required={name === "fullName"} />
            </label>
          ))}
          <label className="block">
            Experience in whole years
            <input className={input} name="experience" type="number" min={0} max={100} required defaultValue={candidate.experience} />
          </label>
          <div>
            <label className="block" htmlFor="candidate-notes">Recruiter notes</label>
            <textarea id="candidate-notes" name="notes" className={input} defaultValue={candidate.notes ?? ""} maxLength={10000} rows={6} />
          </div>
          <SubmitButton className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">Save profile</SubmitButton>
        </form>
      </div>
    </section>
  );
}