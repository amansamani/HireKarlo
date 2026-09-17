import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function getResumeDownloadUrl(storedUrl: string) {
  const url = new URL(storedUrl);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") throw new Error("Invalid resume host");
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || !url.pathname.startsWith(`/${cloud}/raw/`)) throw new Error("Invalid resume cloud");
  if (!url.pathname.includes("/authenticated/")) return storedUrl; // Legacy data: migrate before launch.
  const upload = await prisma.resumeUpload.findFirst({ where: { url: storedUrl }, select: { publicId: true } });
  if (!upload) throw new Error("Resume storage record is missing");
  return cloudinary.utils.private_download_url(upload.publicId, "", {
    resource_type: "raw", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60,
    attachment: true,
  });
}
