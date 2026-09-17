import { logError } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueEmail, dispatchQueuedEmail } from "@/lib/send-email";
import { interviewReminderEmail } from "@/lib/email-templates";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60_000);

  try {
    const dueInterviews = await prisma.interview.findMany({
      where: { scheduledAt: { gte: windowStart, lte: windowEnd }, reminderSentAt: null },
      take: 100,
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        round: true,
        interviewer: true,
        scheduledAt: true,
        application: {
          select: {
            candidate: { select: { fullName: true, email: true } },
            job: { select: { title: true } },
          },
        },
      },
    });

    let sent = 0;
    for (const interview of dueInterviews) {
      try {
        const { subject, html } = interviewReminderEmail(
          interview.application.candidate.fullName,
          interview.application.job.title,
          interview.round,
          interview.interviewer,
          interview.scheduledAt
        );
        const id = await prisma.$transaction(async tx => {
          await tx.interview.update({ where: { id: interview.id }, data: { reminderSentAt: new Date() } });
          return enqueueEmail(tx, interview.application.candidate.email, subject, html, undefined, `interview-reminder:${interview.id}`);
        });
        dispatchQueuedEmail(id);
        sent++;
      } catch (err) {
        logError("app.api.cron.interview-reminders.route", err);
      }
    }

    return NextResponse.json({ checked: dueInterviews.length, sent });
  } catch (error) {
    logError("app.api.cron.interview-reminders.route", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}