import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cloudinary } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const expired = await prisma.resumeUpload.findMany({ where: { expiresAt: { lt: new Date() }, consumedAt: null }, select: { id: true, publicId: true, url: true }, take: 100 });
    let deleted = 0;
    for (const upload of expired) {
      try { await cloudinary.uploader.destroy(upload.publicId, { resource_type: "raw", type: upload.url.includes("/authenticated/") ? "authenticated" : "upload", invalidate: true }); }
      catch (error) { logError("app.api.cron.resume-cleanup.route", error); continue; }
      await prisma.resumeUpload.delete({ where: { id: upload.id } }); deleted++;
    }
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.applicationChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await prisma.verificationToken.deleteMany({ where: { expires: { lt: new Date() } } });
    const cutoff = new Date(Date.now() - 30 * 86_400_000);
    await prisma.emailOutbox.deleteMany({ where: { OR: [{ sentAt: { lt: cutoff } }, { failedAt: { lt: cutoff } }] } });
    return NextResponse.json({ checked: expired.length, deleted });
  } catch (error) { logError("app.api.cron.resume-cleanup.route", error); return NextResponse.json({ error: "Cleanup failed" }, { status: 500 }); }
}
