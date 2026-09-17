import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import type { UploadApiResponse } from "cloudinary";

import { allowRequest } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/plans";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_SIZE = 3 * 1024 * 1024;
const UPLOAD_TTL_MS = 30 * 60 * 1000;

function matchesSignature(buffer: Buffer, ext: string): boolean {
  const sig = buffer.subarray(0, 4);
  if (ext === "pdf") return sig.toString("ascii", 0, 4) === "%PDF";
  if (ext === "docx") return sig[0] === 0x50 && sig[1] === 0x4b && sig[2] === 0x03 && sig[3] === 0x04;
  if (ext === "doc") return sig[0] === 0xd0 && sig[1] === 0xcf && sig[2] === 0x11 && sig[3] === 0xe0;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await allowRequest(`upload:${ip}`, 5, 600_000))) {
      return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const jobIdValue = formData.get("jobId");
    const jobId = typeof jobIdValue === "string" ? jobIdValue : null;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job reference." }, { status: 400 });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true, organization: { select: { trialEndsAt: true, subscription: true } } } });
    if (!job || job.status !== "OPEN") {
      return NextResponse.json({ error: "This job posting is no longer accepting applications." }, { status: 400 });
    }
    if (!effectivePlan(job.organization.subscription, job.organization.trialEndsAt)) {
      return NextResponse.json({ error: "This organization is not accepting applications right now." }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: "Only PDF and DOCX allowed." }, { status: 400 });
    }

    if (file.size === 0 || file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 3MB." }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!matchesSignature(buffer, ext)) {
      return NextResponse.json({ error: "File content doesn't match its extension." }, { status: 400 });
    }

    const publicId = `${randomUUID()}.${ext}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "HireKarlo/resumes",
          type: "authenticated",
          public_id: publicId,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) return reject(error ?? new Error("Upload failed."));
          resolve(uploadResult);
        }
      );
      stream.end(buffer);
    });

    let upload;
    try {
    upload = await prisma.resumeUpload.create({
      data: {
        jobId,
        url: result.secure_url,
        publicId: result.public_id,
        expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
      },
      select: { id: true },
    });
    } catch (error) {
      await cloudinary.uploader.destroy(result.public_id, { resource_type: "raw", type: "authenticated", invalidate: true }).catch(() => {});
      throw error;
    }

    return NextResponse.json({ uploadId: upload.id });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload processing failed." }, { status: 500 });
  }
}
