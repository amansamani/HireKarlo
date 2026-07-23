import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { interviewReminderEmail } from "@/lib/email-templates";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60_000);

  try {
    const dueInterviews = await prisma.interview.findMany({
      where: { scheduledAt: { gte: windowStart, lte: windowEnd }, reminderSentAt: null },
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
        await sendEmail(interview.application.candidate.email, subject, html);
        await prisma.interview.update({ where: { id: interview.id }, data: { reminderSentAt: new Date() } });
        sent++;
      } catch (err) {
        console.error(`[interview-reminders] failed for interview ${interview.id}:`, err);
      }
    }

    return NextResponse.json({ checked: dueInterviews.length, sent });
  } catch (error) {
    console.error("[interview-reminders] cron failed:", error);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}