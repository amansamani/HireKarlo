"use client";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
export function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status"><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span className="sr-only">Loading page…</span></span> : null;
}
