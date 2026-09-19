import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?";
}

// Read-only by design: candidate details come from the candidate's own application.
// Hiring staff can view them but there is deliberately no edit form or edit action.
export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <section className="mx-auto max-w-3xl space-y-8 p-6">
      <Link href="/dashboard/candidates" className="text-sm text-muted-foreground hover:text-foreground">← Candidates</Link>

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
            {candidate.experience > 0 && <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" aria-hidden="true" /><dt className="sr-only">Experience</dt><dd>{candidate.experience} yr{candidate.experience === 1 ? "" : "s"} experience</dd></div>}
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
          <p className="text-xs text-muted-foreground">Submitted by the candidate. View only — hiring staff can&apos;t edit candidate details.</p>
        </div>
      </div>

      {candidate.notes && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap rounded-2xl border border-border/40 bg-card p-4 text-sm">{candidate.notes}</p>
        </div>
      )}

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
    </section>
  );
}