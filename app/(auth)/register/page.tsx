"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { KanbanSquare, Sparkles, MailCheck, Check, X, ArrowRight } from "lucide-react";

import { registerAction } from "@/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { cn } from "@/lib/utils";
import Image from "next/image";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
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
    <ul className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3">
      {passwordChecks.map(({ label, test }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 text-xs transition-all duration-200",
              met
                ? "text-emerald-500 font-medium"
                : "text-muted-foreground"
            )}
          >
            <div className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full transition-all duration-200",
              met
                ? "bg-emerald-500/20 scale-100"
                : "bg-muted scale-90"
            )}>
              {met ? (
                <Check className="size-2.5 shrink-0" />
              ) : (
                <X className="size-2.5 shrink-0" />
              )}
            </div>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const password = form.watch("password");

  async function onSubmit(values: z.infer<typeof RegisterSchema>) {
    setIsLoading(true);
    const res = await registerAction(values);
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      setSubmittedEmail(values.email);
    }
  }

  return (
    <div className="relative isolate grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* Background image */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src="/hero-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background" />
      </div>

      <AuthBrandPanel
        heading="Post a job, share one link"
        subheading="Let candidates apply without an account while AI scores every resume for you. Start your free account today."
        points={[
          { icon: KanbanSquare, text: "Kanban pipeline across every open role" },
          { icon: Sparkles, text: "AI match scores on every resume" },
          { icon: MailCheck, text: "Candidates notified automatically" },
        ]}
      />

      <div className="flex items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="fixed top-6 left-6 flex items-center gap-2 lg:hidden">
          <Image
            src="/logo.webp"
            alt="HireKarlo Logo"
            width={112}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
          <span className="font-bold tracking-tight">HireKarlo</span>
        </div>

        {submittedEmail ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md duration-700">
            <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl backdrop-saturate-150 p-8 text-center shadow-2xl shadow-black/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <MailCheck className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    Verify your email
                  </h1>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We sent a verification link to{" "}
                    <span className="font-semibold text-foreground">
                      {submittedEmail}
                    </span>
                    . Click it to activate your account before logging in.
                  </p>
                </div>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "group h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.01]"
                  )}
                >
                  Back to login
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <p className="text-xs text-muted-foreground">
                  Didn&apos;t receive it? Check your spam folder or{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    try again
                  </Link>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md duration-700">
            <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl backdrop-saturate-150 p-8 shadow-2xl shadow-black/10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="space-y-2 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-background/50 backdrop-blur-sm">
                    <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Create an account
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Register as a recruiter to get started
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="recruiter@company.com"
                              className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Password
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Create a strong password"
                              className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <PasswordChecklist password={password} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="group h-12 w-full rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.01]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Create Account
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="relative flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}