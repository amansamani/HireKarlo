"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, pendingLabel = "Saving…", disabled, className, ...props }: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", className)}>
    {pending && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
    <span aria-live="polite">{pending ? pendingLabel : children}</span>
  </button>;
}
