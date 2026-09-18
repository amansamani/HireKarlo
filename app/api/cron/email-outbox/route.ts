import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverEmail } from "@/lib/send-email";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  const now = new Date();
  const pending = await prisma.emailOutbox.findMany({ where: { sentAt: null, failedAt: null, availableAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, select: { id: true }, orderBy: { availableAt: "asc" }, take: 20 });
  const results = await Promise.all(pending.map(message => deliverEmail(message.id)));
  const sent = results.filter(Boolean).length;
  const failed = await prisma.emailOutbox.count({ where: { failedAt: { not: null } } });
  return NextResponse.json({ checked: pending.length, sent, failed });
}
