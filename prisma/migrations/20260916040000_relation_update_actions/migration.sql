ALTER TABLE "AgencyClient" DROP CONSTRAINT "AgencyClient_organizationId_fkey";
ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "AgencyClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_organizationId_fkey";
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageCounter" DROP CONSTRAINT "UsageCounter_organizationId_fkey";
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
