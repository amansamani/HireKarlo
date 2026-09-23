import { z } from "zod";
import { normalizeEmail, checkApplicationCode } from "@/lib/application-otp";
import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { assertSafeDocx } from "@/lib/docx-validation";
import type { UploadApiResponse } from "cloudinary";

import { allowRequest } from "@/lib/rate-limit";
import { effectivePlan } from "@/lib/plans";
import { readBoundedBody, BodyLimitError } from "@/lib/bounded-body";

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
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await allowRequest(`upload:${ip}`, 5, 600_000))) {
      return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
    }

    if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) return NextResponse.json({error:"Use multipart form data."},{status:400});
    if (Number(req.headers.get("content-length")) > MAX_SIZE + 64 * 1024) return NextResponse.json({error:"Request too large."},{status:413});
    const bytes = await readBoundedBody(req, MAX_SIZE + 64 * 1024);
    const formData = await new Response(bytes, { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
    const email = z.string().trim().max(254).email().transform(normalizeEmail).safeParse(formData.get("email"));
    const otp = formData.get("otp");
    if (!email.success || typeof otp !== "string" || !(await checkApplicationCode(email.data,otp.trim()))) return NextResponse.json({error:"Verify your email before uploading."},{status:403});
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

    if (ext === "docx") { try { assertSafeDocx(buffer); } catch { return NextResponse.json({ error: "Invalid or oversized DOCX archive." }, { status: 400 }); } }

    const publicId = `${randomUUID()}.${ext}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          timeout: 20_000,
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
    const storedUrl = cloudinary.url(result.public_id, { resource_type: "raw", type: "authenticated", secure: true, sign_url: false });
    upload = await prisma.resumeUpload.create({
      data: {
        jobId,
        url: storedUrl,
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
    if (error instanceof BodyLimitError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    logError("app.api.upload.route", error);
    return NextResponse.json({ error: "Upload processing failed." }, { status: 500 });
  }
}
