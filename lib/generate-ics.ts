function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateInterviewICS(params: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  durationMinutes: number;
}): string {
  const end = new Date(params.start.getTime() + params.durationMinutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HireKarlo//Interview Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@hirekarlo.amansamani.me`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(params.start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(params.title)}`,
    `DESCRIPTION:${escapeICS(params.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}