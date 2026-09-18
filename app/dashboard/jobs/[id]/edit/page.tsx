import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { editJobAction } from "@/actions/edit-records";

export default async function EditJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) notFound();
  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!job) notFound();
  const input = "mt-2 block w-full rounded-lg border border-border bg-background p-3";
  return <section className="mx-auto max-w-3xl space-y-6 p-6"><Link href={`/dashboard/jobs/${id}`}>← Pipeline</Link><h1 className="text-3xl font-bold">Edit opening</h1>{(await searchParams).error && <p role="alert">Could not save. Check the fields and your active plan, then try again.</p>}<form action={editJobAction} className="space-y-5"><input type="hidden" name="id" value={id}/>{[["title","Job title",job.title,150],["department","Department",job.department,100],["location","Location",job.location,150],["salaryRange","Salary range",job.salaryRange ?? "",150]].map(([name,label,value,max]) => <label className="block" key={String(name)}>{label}<input className={input} name={String(name)} defaultValue={String(value)} maxLength={Number(max)} required={name !== "salaryRange"}/></label>)}<div><label className="block" htmlFor="job-description">Description</label><textarea id="job-description" className={input} name="description" defaultValue={job.description} required minLength={10} maxLength={20000} rows={12}/></div><SubmitButton className="rounded-lg bg-primary px-5 py-3 text-primary-foreground">Save opening</SubmitButton></form></section>;
}
