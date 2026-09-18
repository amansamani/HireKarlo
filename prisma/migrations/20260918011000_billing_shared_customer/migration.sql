-- One payer may own multiple workspaces. Subscription identity and tenant
-- ownership stay unique; a provider customer identity is not a tenant boundary.
ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_providerCustomerId_key";
DROP INDEX IF EXISTS "Subscription_providerCustomerId_key";
