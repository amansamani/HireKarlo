import nodemailer from "nodemailer";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { logError } from "@/lib/logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== "false",
  connectionTimeout: 10_000, socketTimeout: 20_000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

type Attachment = { filename: string; content: string; contentType: string };

export async function enqueueEmail(tx: Pick<Prisma.TransactionClient, "emailOutbox">, to: string, subject: string, html: string, attachments?: Attachment[], dedupeKey?: string) {
  const data = { recipient: to, subject, html, ...(attachments ? { attachments } : {}), ...(dedupeKey ? { dedupeKey } : {}) };
  const message = dedupeKey ? await tx.emailOutbox.upsert({ where: { dedupeKey }, create: data, update: {} }) : await tx.emailOutbox.create({ data });
  return message.id;
}
export function dispatchQueuedEmail(id: string) {
  try { after(async () => { try { await deliverEmail(id); } catch (error) { logError("email.dispatch_failed", error); } }); }
  catch (error) { logError("email.schedule_failed", error); }
}
export async function sendEmail(to: string, subject: string, html: string, attachments?: Attachment[], dedupeKey?: string) {
  const id = await enqueueEmail(prisma, to, subject, html, attachments, dedupeKey);
  dispatchQueuedEmail(id);
}

export async function deliverEmail(id: string): Promise<boolean> {
  const now = new Date();
  const leaseToken = randomUUID();
  const claimed = await prisma.emailOutbox.updateMany({
    where: { id, sentAt: null, failedAt: null, availableAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
    data: { leaseUntil: new Date(now.getTime() + 120_000), leaseToken, attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;
  const message = await prisma.emailOutbox.findUniqueOrThrow({ where: { id } });
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("SMTP unavailable");
    await transporter.sendMail({ from: `"HireKarlo" <${process.env.EMAIL_USER}>`, to: message.recipient, subject: message.subject, html: message.html, attachments: (message.attachments ?? undefined) as Attachment[] | undefined });
    const acknowledged = await prisma.emailOutbox.updateMany({ where: { id, leaseToken }, data: { sentAt: new Date(), leaseUntil: null, leaseToken: null } });
    return acknowledged.count === 1;
  } catch {
    await prisma.emailOutbox.updateMany({ where: { id, leaseToken }, data: { leaseUntil: null, leaseToken: null, availableAt: new Date(Date.now() + Math.min(3600_000, 60_000 * 2 ** message.attempts)), ...(message.attempts >= 8 ? { failedAt: new Date() } : {}) } });
    logError("lib.send-email");
    return false;
  }
}
