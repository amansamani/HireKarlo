import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const expired = await prisma.resumeUpload.findMany({ where: { expiresAt: { lt: new Date() }, consumedAt: null }, select: { id: true, publicId: true }, take: 100 });
    let deleted = 0;
    for (const upload of expired) {
      try { await cloudinary.uploader.destroy(upload.publicId, { resource_type: "raw", invalidate: true }); }
      catch (error) { console.error(`[resume-cleanup] Cloudinary delete failed for ${upload.publicId}:`, error); continue; }
      await prisma.resumeUpload.delete({ where: { id: upload.id } }); deleted++;
    }
    return NextResponse.json({ checked: expired.length, deleted });
  } catch (error) { console.error("[resume-cleanup] cron failed:", error); return NextResponse.json({ error: "Cleanup failed" }, { status: 500 }); }
}
