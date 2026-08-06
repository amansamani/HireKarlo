"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { ShieldCheck, Check, X, Loader2, ArrowRight } from "lucide-react";

// ✅ resetPasswordAction needs { email, token, password }
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const Schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[0-9]/, "One number")
      .regex(/[^A-Za-z0-9]/, "One special character"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

const checks = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Number", test: (v: string) => /[0-9]/.test(v) },
  { label: "Special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? ""; // ✅ FIXED — required by the action
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: { password: "", confirm: "" },
  });
  const password = form.watch("password");

  async function onSubmit(values: z.infer<typeof Schema>) {
    setIsLoading(true);
    // ✅ FIXED call — includes email
    const res = await resetPasswordAction({ email, token, password: values.password });
    setIsLoading(false);
    if (res?.error) toast.error(res.error);
    else setDone(true);
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        {done ? (
          <div className="relative z-10 space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/30 bg-success/10">
              <ShieldCheck className="h-8 w-8 text-success" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. Log in with your new credentials.
              </p>
            </div>
            <Link href="/login" className="block">
              <Button className="group h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20">
                Go to login
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="relative z-10 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-background/50">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
              <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2">
                        {checks.map(({ label, test }) => {
                          const met = test(password);
                          return (
                            <li
                              key={label}
                              className={cn(
                                "flex items-center gap-1.5 text-[11px] transition-colors",
                                met ? "text-emerald-500 font-medium" : "text-muted-foreground"
                              )}
                            >
                              {met ? <Check className="size-3" /> : <X className="size-3" />} {label}
                            </li>
                          );
                        })}
                      </ul>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/hero-bg.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background" />
      </div>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </div>
  );
}