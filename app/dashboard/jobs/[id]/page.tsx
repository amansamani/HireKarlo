// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { getJobApplicantsAction } from "@/actions/application";
import JobPipelineClient from "./JobPipelineClient";

export default async function JobPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await getJobApplicantsAction(id);

  if (!raw || raw.error) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
        <p className="text-base font-semibold">Pipeline not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {raw?.error ?? "This job no longer exists."}
        </p>
      </div>
    );
  }

  const rawJob = raw.job ?? null;
  const applications = raw.applications ?? raw.applicants ?? [];

  if (!rawJob) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
        <p className="text-base font-semibold">Job not found</p>
      </div>
    );
  }

  const job = {
    id: rawJob.id ?? id,
    title: rawJob.title ?? "Pipeline",
    department: rawJob.department ?? "",
    location: rawJob.location ?? "",
    type: rawJob.type ?? "FULL_TIME",
    status: rawJob.status ?? "OPEN",
    interviewRounds: rawJob.interviewRounds ?? [],
  };

  return <JobPipelineClient job={job} initialApplications={applications} />;
}