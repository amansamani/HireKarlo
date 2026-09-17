import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { canEditPipeline } from "@/lib/roles";
import { getResumeDownloadUrl } from "@/lib/resume-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOrg();
  if (!ctx || !canEditPipeline(ctx.role)) return new NextResponse("Unauthorized", { status: 403 });
  const { id } = await params;
  const candidate = await prisma.candidate.findFirst({ where: { id, organizationId: ctx.organizationId }, select: { resumeUrl: true } });
  if (!candidate?.resumeUrl) return new NextResponse("Not found", { status: 404 });
  try {
    return NextResponse.redirect(await getResumeDownloadUrl(candidate.resumeUrl), { headers: { "Cache-Control": "private, no-store" } });
  } catch { return new NextResponse("Resume temporarily unavailable", { status: 503 }); }
}
