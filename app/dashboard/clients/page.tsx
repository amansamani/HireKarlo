import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canEditPipeline } from "@/lib/roles";
import { createAgencyClientAction, assignJobClientAction } from "@/actions/agency-clients";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ error?: string; page?: string }> }) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) redirect("/dashboard");
  const query = await searchParams;
  const rawPage = Number(query.page ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const [clients, choices, jobs] = await Promise.all([
    prisma.agencyClient.findMany({ where: { organizationId: ctx.organizationId }, include: { jobs: { select: { id: true, title: true, status: true }, take: 10 }, _count: { select: { jobs: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 25, take: 26 }),
    prisma.agencyClient.findMany({ where: { organizationId: ctx.organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.job.findMany({ where: { organizationId: ctx.organizationId, status: "OPEN" }, select: { id: true, title: true, clientId: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const inputClass = "mt-2 block w-full rounded-lg border border-border bg-background p-3";
  return <main className="mx-auto max-w-5xl p-6"><h1 className="text-3xl font-bold">Agency clients</h1><p className="mt-3 text-muted-foreground">Keep client contacts and connect their open roles to your hiring pipeline.</p>
    {query.error && <p role="alert" className="mt-5 text-destructive">Couldn&apos;t save your change. Check the details and your active plan, then try again.</p>}
    <form action={createAgencyClientAction} className="my-7 rounded-xl border border-border p-5"><h2 className="text-xl font-semibold">Add a client</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label>Company name<input className={inputClass} name="name" required minLength={2} maxLength={150}/></label><label>Contact email<input className={inputClass} name="contactEmail" type="email"/></label></div><label className="mt-4 block">Notes<textarea className={inputClass} name="notes" maxLength={3000}/></label><button className="mt-5 rounded-lg bg-primary px-5 py-3 text-primary-foreground">Add client</button></form>
    <section><h2 className="text-xl font-semibold">Assign active jobs</h2><div className="mt-4 space-y-3">{jobs.map(job => <form key={job.id} action={assignJobClientAction} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4"><Link className="flex-1 font-semibold" href={`/dashboard/jobs/${job.id}`}>{job.title}</Link><input type="hidden" name="jobId" value={job.id}/><select aria-label={`Client for ${job.title}`} name="clientId" defaultValue={job.clientId ?? ""} className="rounded border border-border bg-background p-2"><option value="">Internal company role</option>{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="rounded border border-border px-4 py-2">Save</button></form>)}{!jobs.length && <p className="text-muted-foreground">Create a job to assign it to a client.</p>}</div></section>
    <div className="mt-8 grid gap-4 md:grid-cols-2">{clients.slice(0,25).map(client => <article key={client.id} className="rounded-xl border border-border p-5"><h2 className="text-xl font-bold">{client.name}</h2><p className="mt-2 text-sm text-muted-foreground">{client.contactEmail ?? "No contact email"} · {client._count.jobs} jobs</p>{client.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{client.notes}</p>}<ul className="mt-4 space-y-2">{client.jobs.map(job => <li key={job.id}><Link className="text-primary" href={`/dashboard/jobs/${job.id}`}>{job.title}</Link> <span className="text-xs text-muted-foreground">{job.status}</span></li>)}</ul></article>)}</div>
    <nav className="mt-7 flex gap-5" aria-label="Client pages">{page > 1 && <Link href={`?page=${page-1}`}>Previous</Link>}{clients.length > 25 && <Link href={`?page=${page+1}`}>Next</Link>}</nav>
  </main>;
}
