import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function getResumeDownloadUrl(storedUrl: string) {
  const url = new URL(storedUrl);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") throw new Error("Invalid resume host");
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || !url.pathname.startsWith(`/${cloud}/raw/`)) throw new Error("Invalid resume cloud");
  if (url.pathname.startsWith(`/${cloud}/raw/upload/`)) return storedUrl; // Legacy data: migrate before launch.
  const authenticatedPrefix = `/${cloud}/raw/authenticated/`;
  if (!url.pathname.startsWith(authenticatedPrefix)) throw new Error("Invalid resume delivery type");
  const upload = await prisma.resumeUpload.findFirst({ where: { url: storedUrl }, select: { publicId: true } });
  // Resumes uploaded before ResumeUpload existed have no upload row. Their
  // authenticated Cloudinary URL still contains the public ID after migration.
  const path = url.pathname.slice(authenticatedPrefix.length).replace(/^v\d+\//, "");
  const publicId = upload?.publicId ?? decodeURIComponent(path);
  if (!publicId) throw new Error("Resume public ID is missing");
  return cloudinary.utils.private_download_url(publicId, "", {
    resource_type: "raw", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60,
    attachment: true,
  });
}
