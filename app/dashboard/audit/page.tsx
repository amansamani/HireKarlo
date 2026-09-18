import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/require-auth";
import { canManageTeam } from "@/lib/roles";
export default async function AuditPage() {
  const ctx = await requireOrg(); if (!ctx || !canManageTeam(ctx.role)) notFound();
  const events = await prisma.auditEvent.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
  return <main className="mx-auto max-w-5xl space-y-5 p-6"><h1 className="text-3xl font-bold">Workspace audit history</h1><p>Most recent 100 administrative and record events. Candidate stage history remains on the pipeline.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Time (UTC)</th><th>Action</th><th>Actor ID</th><th>Record ID</th></tr></thead><tbody>{events.map(e => <tr key={e.id} className="border-t border-border"><td className="p-3">{e.createdAt.toISOString()}</td><td>{e.action}</td><td>{e.actorId}</td><td>{e.targetId}</td></tr>)}</tbody></table></div>{!events.length && <p>No administrative events yet.</p>}</main>;
}
