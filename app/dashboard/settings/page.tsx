import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { switchOrganizationAction } from "@/actions/organizations";

export default async function SettingsPage() {
  const ctx = await requireOrg();
  if (!ctx) redirect("/login");
  const memberships = await prisma.membership.findMany({ where: { userId: ctx.userId }, include: { organization: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
  return <main className="mx-auto max-w-2xl p-6"><h1 className="text-3xl font-bold">Your workspaces</h1><p className="mt-3 text-muted-foreground">Choose the organization you want to work in. Permissions and usage limits belong to each organization.</p><div className="mt-7 space-y-4">{memberships.map(m => <form key={m.id} action={switchOrganizationAction} className="flex items-center justify-between rounded-xl border border-border p-5"><div><h2 className="font-semibold">{m.organization.name}</h2><p className="mt-1 text-sm text-muted-foreground">{m.role} {m.organizationId === ctx.organizationId && "· Current"}</p></div><input type="hidden" name="organizationId" value={m.organizationId}/><button className="rounded-lg border border-border px-4 py-2" disabled={m.organizationId === ctx.organizationId}>Switch</button></form>)}</div></main>;
}
