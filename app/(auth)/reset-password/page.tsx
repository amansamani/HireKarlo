"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { KanbanSquare, Sparkles, MailCheck, Check, X, ShieldAlert } from "lucide-react";

import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { cn } from "@/lib/utils";

// Kept in sync with the server-side rule in actions/auth.ts.
const ResetPasswordFormSchema = z.object({
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter")
    .regex(/[0-9]/, "At least one number")
    .regex(/[^A-Za-z0-9]/, "At least one special character"),
});

const passwordChecks = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number", test: (v: string) => /[0-9]/.test(v) },
  { label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
      {passwordChecks.map(({ label, test }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              met ? "text-emerald-500" : "text-muted-foreground"
            )}
          >
            {met ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // null = no token/email in the URL, "checking" = not read yet (avoids a
  // flash of the invalid-link state during hydration — window.location isn't
  // available on the server render, same reason login/page.tsx defers its
  // searchParams read into useEffect instead of next/navigation's
  // useSearchParams).
  const [linkParams, setLinkParams] = useState<{ email: string; token: string } | null | "checking">("checking");

  const form = useForm<z.infer<typeof ResetPasswordFormSchema>>({
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: { password: "" },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const password = form.watch("password");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    const token = params.get("token");
    setLinkParams(email && token ? { email, token } : null);
  }, []);

  async function onSubmit(values: z.infer<typeof ResetPasswordFormSchema>) {
    if (!linkParams || linkParams === "checking") return;
    setIsLoading(true);
    const res = await resetPasswordAction({ ...linkParams, password: values.password });
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Password updated — you can log in now.");
      router.push("/login");
    }
  }

  return (
    <div className="relative isolate grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[url(/hero-bg.webp)] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />
      <AuthBrandPanel
        heading="Choose a new password"
        subheading="Almost there — set a fresh password to get back into your pipeline."
        points={[
          { icon: KanbanSquare, text: "Kanban pipeline across every open role" },
          { icon: Sparkles, text: "AI match scores on every resume" },
          { icon: MailCheck, text: "Candidates notified automatically" },
        ]}
      />

      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-card/60 p-6 shadow-xl backdrop-blur-xl backdrop-saturate-150 duration-700 sm:p-8">
          {linkParams === null ? (
            <div className="space-y-4 text-center">
              <ShieldAlert className="mx-auto size-10 text-destructive" />
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold tracking-tight">Invalid reset link</h1>
                <p className="text-sm text-muted-foreground">
                  This link is missing or malformed. Request a new one from the login page.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="inline-block font-medium text-primary hover:underline underline-offset-4"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 text-center lg:text-left">
                <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
                <p className="text-sm text-muted-foreground">Choose something you haven&apos;t used before.</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="••••••••"
                            {...field}
                            disabled={isLoading || linkParams === "checking"}
                          />
                        </FormControl>
                        <PasswordChecklist password={password} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="h-10 w-full font-semibold"
                    disabled={isLoading || linkParams === "checking"}
                  >
                    {isLoading ? "Updating..." : "Update password"}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}