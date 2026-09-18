ALTER TABLE "BillingCheckout" ADD COLUMN "plan" TEXT,
  ADD COLUMN "currency" TEXT, ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "requestBody" TEXT;
CREATE UNIQUE INDEX "BillingCheckout_idempotencyKey_key" ON "BillingCheckout"("idempotencyKey");
ALTER TABLE "EmailOutbox" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");
