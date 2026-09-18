import type { Prisma } from "@prisma/client";

// Exclude documents, tokens, emails and arbitrary request payloads. IDs remain
// available after entity removal, rather than cascading away the audit trail.
export function recordAudit(tx: Pick<Prisma.TransactionClient, "auditEvent">,
  ctx: { organizationId: string; userId: string }, action: string, targetId: string) {
  return tx.auditEvent.create({ data: { organizationId: ctx.organizationId, actorId: ctx.userId, action, targetId } });
}
