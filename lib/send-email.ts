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

// Gmail (and most providers) score HTML-only mail as more likely spam/bulk mail.
// Derive a plain-text part from the stored HTML at send time so every message is
// multipart/alternative without changing the template return shape or DB schema.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => `${label.replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Override via env once a custom-domain sender (with SPF/DKIM/DMARC configured) replaces
// raw Gmail SMTP — no code change needed at that point, just EMAIL_FROM_*.
const FROM_NAME = process.env.EMAIL_FROM_NAME || "HireKarlo";
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

type Attachment = { filename: string; content: string; contentType: string };

export async function enqueueEmail(tx: Pick<Prisma.TransactionClient, "emailOutbox">, to: string, subject: string, html: string, attachments?: Attachment[], dedupeKey?: string, expiresAt?: Date) {
  const data = { recipient: to, subject, html, ...(attachments ? { attachments } : {}), ...(dedupeKey ? { dedupeKey } : {}), ...(expiresAt ? { expiresAt } : {}) };
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
  if (message.expiresAt && message.expiresAt <= new Date()) {
    await prisma.emailOutbox.updateMany({ where: { id, leaseToken }, data: { failedAt: new Date(), leaseUntil: null, leaseToken: null } });
    return false;
  }
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("SMTP unavailable");
    await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_ADDRESS}>`, to: message.recipient, subject: message.subject, html: message.html, text: htmlToText(message.html), attachments: (message.attachments ?? undefined) as Attachment[] | undefined });
    const acknowledged = await prisma.emailOutbox.updateMany({ where: { id, leaseToken }, data: { sentAt: new Date(), leaseUntil: null, leaseToken: null } });
    return acknowledged.count === 1;
  } catch {
    await prisma.emailOutbox.updateMany({ where: { id, leaseToken }, data: { leaseUntil: null, leaseToken: null, availableAt: new Date(Date.now() + Math.min(3600_000, 60_000 * 2 ** message.attempts)), ...(message.attempts >= 8 ? { failedAt: new Date() } : {}) } });
    logError("lib.send-email");
    return false;
  }
}