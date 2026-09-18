import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { editCandidateAction } from "@/actions/edit-records";

export default async function CandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const ctx = await requireOrg(); if (!ctx || !canEditPipeline(ctx.role)) notFound();
  const { id } = await params;
  const candidate = await prisma.candidate.findFirst({ where: { id, organizationId: ctx.organizationId }, include: { applications: { select: { id: true, stage: true, job: { select: { id: true, title: true } } }, take: 100 } } });
  if (!candidate) notFound();
  const query = await searchParams, input = "mt-2 block w-full rounded-lg border border-border bg-background p-3";
  return <section className="mx-auto max-w-3xl space-y-6 p-6"><Link href="/dashboard/candidates">← Candidates</Link><h1 className="text-3xl font-bold">Candidate profile</h1><p>{candidate.email}</p>{query.error && <p role="alert">Could not save. Check the fields and your active plan.</p>}{query.saved && <p role="status">Profile saved.</p>}<form action={editCandidateAction} className="space-y-5"><input name="id" type="hidden" value={id}/>{[["fullName","Full name",candidate.fullName,120],["phone","Phone",candidate.phone ?? "",50],["currentCompany","Current company",candidate.currentCompany ?? "",150],["skills","Skills, separated by commas",candidate.skills.join(", "),3000]].map(([name,label,value,max]) => <label className="block" key={String(name)}>{label}<input className={input} name={String(name)} defaultValue={String(value)} maxLength={Number(max)} required={name === "fullName"}/></label>)}<label className="block">Experience in whole years<input className={input} name="experience" type="number" min={0} max={100} required defaultValue={candidate.experience}/></label><div><label className="block" htmlFor="candidate-notes">Recruiter notes</label><textarea id="candidate-notes" name="notes" className={input} defaultValue={candidate.notes ?? ""} maxLength={10000} rows={6}/></div><SubmitButton className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">Save profile</SubmitButton></form><h2 className="text-xl font-semibold">Applications</h2><ul>{candidate.applications.map(a => <li key={a.id}><Link className="underline" href={`/dashboard/jobs/${a.job.id}`}>{a.job.title}</Link> · {a.stage}</li>)}</ul></section>;
}
