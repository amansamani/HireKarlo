import Link from "next/link";
import { getJobApplicantsAction } from "@/actions/application";
import JobPipelineClient from "./JobPipelineClient";

export default async function JobPipelinePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{page?:string}>;
}) {
  const { id } = await params;
  const requestedPage = Number((await searchParams).page ?? 1);
  const raw = await getJobApplicantsAction(id, requestedPage);

  if ("error" in raw && raw.error) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-border/60 bg-card/30 py-16 text-center">
        <p className="text-base font-semibold">Pipeline not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {raw?.error ?? "This job no longer exists."}
        </p>
      </div>
    );
  }

  const rawJob = "job" in raw ? raw.job : null;
  const applications = raw.applications;

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

  return <><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 pt-4 text-sm"><p>Page {raw.page ?? 1}. Stage counts describe the applicants on this page (up to 100).</p><nav aria-label="Applicant pages" className="flex gap-4">{(raw.page ?? 1) > 1 && <Link href={`?page=${(raw.page ?? 1)-1}`}>Previous</Link>}{raw.hasMore && <Link href={`?page=${(raw.page ?? 1)+1}`}>Next</Link>}</nav></div><JobPipelineClient job={job} initialApplications={applications} /></>;
}
