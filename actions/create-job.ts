"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createJobAction(data: {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!data.title || !data.department || !data.location) {
    return { error: "Please fill out all required fields." };
  }

  try {
    const newJob = await prisma.job.create({
      data: {
        userId: session.user.id,
        title: data.title,
        department: data.department,
        location: data.location,
        type: data.type,
        description: data.description,
        status: "OPEN",
      },
    });

    revalidatePath("/dashboard/jobs");
    return { success: "Job position created successfully!", jobId: newJob.id };
  } catch (error) {
    console.error("Job creation error:", error);
    return { error: "Failed to create job position." };
  }
}