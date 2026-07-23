import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicJobApplyForm from "./PublicJobApplyForm";

async function getPublicJob(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId },
    select: {
      title: true,
      department: true,
      location: true,
      type: true,
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getPublicJob(id);

  if (!job) {
    return { title: "Job not found" };
  }

  const description = `${job.department} · ${job.location} · ${job.type} — Apply in minutes with just a resume.`;

  return {
    title: job.title,
    description,
    openGraph: {
      title: job.title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: job.title,
      description,
    },
  };
}

export default async function PublicJobApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = await params;
  const job = await getPublicJob(jobId);

  if (!job) {
    notFound();
  }

  const jobMeta = `${job.department} · ${job.location} · ${job.type}`;

  return <PublicJobApplyForm jobId={jobId} jobTitle={job.title} jobMeta={jobMeta} />;
}