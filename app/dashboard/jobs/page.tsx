import type { ComponentProps } from "react";
import { getAllJobsAction } from "@/actions/jobs-pool";
import JobsPoolClient from "./JobsPoolClient";

export default async function JobsPoolPage() {
  const res = await getAllJobsAction();

  if (res.error || !res.jobs) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-8">
        <h2 className="text-2xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">{res.error || "Failed to load jobs."}</p>
      </div>
    );
  }

  return (
    <JobsPoolClient 
      initialJobs={res.jobs as ComponentProps<typeof JobsPoolClient>["initialJobs"]} 
    />
  );
}