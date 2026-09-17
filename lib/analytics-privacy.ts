import type { BeforeSendEvent } from "@vercel/analytics";
const marketingPaths = new Set(["/", "/pricing", "/privacy", "/terms", "/cookies"]);
export function allowsAnalytics(path: string) { return marketingPaths.has(path); }
export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (!allowsAnalytics(url.pathname)) return null;
    url.search = ""; url.hash = "";
    return { ...event, url: url.href };
  } catch { return null; }
}
