import { prisma } from "@/lib/prisma";
import PublicApplyClient from "./PublicApplyClient";
import { effectivePlan } from "@/lib/plans";

export default async function PublicApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true, title: true, department: true, location: true, type: true, description: true, status: true, organization: { select: { trialEndsAt: true, subscription: true } } } });

  if (!job || job.status !== "OPEN" || !effectivePlan(job.organization.subscription, job.organization.trialEndsAt)) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-border/40 bg-card/70 p-10 text-center shadow-2xl backdrop-blur-xl">
          <p className="text-lg font-bold">Applications are unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The job you&apos;re looking for is no longer accepting applications.
          </p>
        </div>
      </div>
    );
  }

  return <PublicApplyClient job={{ id: job.id, title: job.title, department: job.department, location: job.location, type: job.type, description: job.description, status: job.status }} />;
}
