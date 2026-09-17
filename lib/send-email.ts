import nodemailer from "nodemailer";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function sendEmail(to: string, subject: string, html: string, attachments?: Attachment[], dedupeKey?: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER / EMAIL_PASS missing in .env");
  }

  const data = { recipient: to, subject, html, ...(attachments ? { attachments } : {}), ...(dedupeKey ? { dedupeKey } : {}) };
  const message = dedupeKey ? await prisma.emailOutbox.upsert({ where: { dedupeKey }, create: data, update: {} }) : await prisma.emailOutbox.create({ data });
  after(async () => { await deliverEmail(message.id); });
}

export async function deliverEmail(id: string): Promise<boolean> {
  const now = new Date();
  const claimed = await prisma.emailOutbox.updateMany({
    where: { id, sentAt: null, failedAt: null, availableAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
    data: { leaseUntil: new Date(now.getTime() + 120_000), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return false;
  const message = await prisma.emailOutbox.findUniqueOrThrow({ where: { id } });
  try {
    await transporter.sendMail({ from: `"HireKarlo" <${process.env.EMAIL_USER}>`, to: message.recipient, subject: message.subject, html: message.html, attachments: (message.attachments ?? undefined) as Attachment[] | undefined });
    await prisma.emailOutbox.update({ where: { id }, data: { sentAt: new Date(), leaseUntil: null } });
    return true;
  } catch {
    await prisma.emailOutbox.update({ where: { id }, data: { leaseUntil: null, availableAt: new Date(Date.now() + Math.min(3600_000, 60_000 * 2 ** message.attempts)), ...(message.attempts >= 8 ? { failedAt: new Date() } : {}) } });
    console.error(`[email-outbox] delivery failed for message ${id}; attempt ${message.attempts}`);
    return false;
  }
}
