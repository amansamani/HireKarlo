ALTER TABLE "Subscription" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN "providerStatus" TEXT, ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BillingCheckout" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'stripe';
CREATE TABLE "RazorpayAgreement" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "plan" TEXT NOT NULL,
  "providerPlanId" TEXT NOT NULL, "keyId" TEXT NOT NULL, "amount" INTEGER NOT NULL,
  "providerSubscriptionId" TEXT, "creationAttemptedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'creating', "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RazorpayAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RazorpayAgreement_amount_check" CHECK ("amount" > 0)
);
CREATE UNIQUE INDEX "RazorpayAgreement_providerSubscriptionId_key" ON "RazorpayAgreement"("providerSubscriptionId");
CREATE INDEX "RazorpayAgreement_organizationId_createdAt_idx" ON "RazorpayAgreement"("organizationId", "createdAt");
CREATE INDEX "RazorpayAgreement_nextSyncAt_idx" ON "RazorpayAgreement"("nextSyncAt");
CREATE TABLE "BillingPayment" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "provider" TEXT NOT NULL,
  "providerSubscriptionId" TEXT NOT NULL, "providerPaymentId" TEXT NOT NULL,
  "providerInvoiceId" TEXT NOT NULL, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL, "refundedAmount" INTEGER NOT NULL DEFAULT 0,
  "paidAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BillingPayment_amount_check" CHECK ("amount" >= 0 AND "refundedAmount" BETWEEN 0 AND "amount")
);
CREATE UNIQUE INDEX "BillingPayment_provider_providerPaymentId_key" ON "BillingPayment"("provider", "providerPaymentId");
CREATE INDEX "BillingPayment_organizationId_paidAt_idx" ON "BillingPayment"("organizationId", "paidAt");
