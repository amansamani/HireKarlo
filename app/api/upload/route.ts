import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import type { UploadApiResponse } from "cloudinary";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Best-effort per-instance rate limit — same pattern as lib/require-auth.ts's
// verifiedUsers cache. No Redis in this stack; blunts casual abuse, not a hard wall.
const uploadAttempts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_LIMIT_MAX = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const attempts = (uploadAttempts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  attempts.push(now);
  uploadAttempts.set(key, attempts);
  return attempts.length > RATE_LIMIT_MAX;
}

// file.type is client-reported and trivially spoofable — check real bytes.
// PDF: "%PDF". DOCX: zip signature (docx is a zip container). DOC: OLE header.
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
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many uploads. Try again in a few minutes." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const jobId = formData.get("jobId") as string | null;

    if (!jobId) {
      return NextResponse.json({ error: "Missing job reference." }, { status: 400 });
    }

    // Ties upload to a real, open job posting — closes the "hit the endpoint
    // directly with no job context" abuse path.
    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
    if (!job || job.status !== "OPEN") {
      return NextResponse.json({ error: "This job posting is no longer accepting applications." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: "Only PDF, DOC, DOCX allowed." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!matchesSignature(buffer, ext)) {
      return NextResponse.json({ error: "File content doesn't match its extension." }, { status: 400 });
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "HireKarlo/resumes",
          public_id: `${randomUUID()}.${ext}`,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) return reject(error ?? new Error("Upload failed."));
          resolve(uploadResult);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload processing failed." }, { status: 500 });
  }
}