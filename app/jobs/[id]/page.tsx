import { prisma } from "@/lib/prisma"; // ← use "@/lib/db" if that's your file name
import PublicApplyClient from "@/app/dashboard/jobs/[id]/PublicApplyClient";

export default async function PublicApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });

  if (!job || job.status !== "OPEN") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-border/40 bg-card/70 p-10 text-center backdrop-blur-xl shadow-2xl">
          <p className="text-lg font-bold">This opening is closed</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The job you&apos;re looking for is no longer accepting applications.
          </p>
        </div>
      </div>
    );
  }

  return <PublicApplyClient job={job} />;
}