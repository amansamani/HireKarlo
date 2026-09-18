import Link from "next/link";
import { renameOrganizationAction } from "@/actions/edit-records";
import { canManageTeam } from "@/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { switchOrganizationAction } from "@/actions/organizations";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const query = await searchParams;
  const ctx = await requireOrg();
  if (!ctx) redirect("/login");
  const memberships = await prisma.membership.findMany({ where: { userId: ctx.userId }, include: { organization: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  const current = memberships.find(m => m.organizationId === ctx.organizationId);
  return <main className="mx-auto max-w-2xl p-6"><h1 className="text-3xl font-bold">Your workspaces</h1><p className="mt-3 text-muted-foreground">Choose the organization you want to work in. Permissions and usage limits belong to each organization.</p>{query.error && <p role="alert">Could not update the workspace name.</p>}{query.saved && <p role="status">Workspace updated.</p>}{canManageTeam(ctx.role) && <section className="my-6 space-y-4"><form action={renameOrganizationAction}><label>Workspace name<input name="name" required minLength={2} maxLength={150} defaultValue={current?.organization.name} className="ml-3 rounded border border-border bg-background p-2"/></label><button className="ml-3 rounded border px-4 py-2">Save name</button></form><Link className="underline" href="/dashboard/audit">View audit history</Link></section>}<div className="mt-7 space-y-4">{memberships.map(m => <form key={m.id} action={switchOrganizationAction} className="flex items-center justify-between rounded-xl border border-border p-5"><div><h2 className="font-semibold">{m.organization.name}</h2><p className="mt-1 text-sm text-muted-foreground">{m.role} {m.organizationId === ctx.organizationId && "· Current"}</p></div><input type="hidden" name="organizationId" value={m.organizationId}/><button className="rounded-lg border border-border px-4 py-2" disabled={m.organizationId === ctx.organizationId}>Switch</button></form>)}</div></main>;
}
