"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { KanbanSquare, Sparkles, MailCheck, Check, X } from "lucide-react";

import { registerAction } from "@/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { cn } from "@/lib/utils";

// Kept in sync with the server-side rule in actions/auth.ts.
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

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  
  // eslint-disable-next-line react-hooks/incompatible-library
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
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[url(/hero-bg.webp)] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />
      <AuthBrandPanel
        heading="Post a job, share one link"
        subheading="Let candidates apply without an account while AI scores every resume for you."
        points={[
          { icon: KanbanSquare, text: "Kanban pipeline across every open role" },
          { icon: Sparkles, text: "AI match scores on every resume" },
          { icon: MailCheck, text: "Candidates notified automatically" },
        ]}
      />

      <div className="flex items-center justify-center p-4 sm:p-8">
        {submittedEmail ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-card/60 p-6 text-center shadow-xl backdrop-blur-xl backdrop-saturate-150 duration-700 sm:p-8">
            <MailCheck className="mx-auto size-10 text-primary" />
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">Verify your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to <span className="font-medium text-foreground">{submittedEmail}</span>.
                Click it to activate your account before logging in.
              </p>
            </div>
            <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }), "h-10 w-full")}>
              Back to login
            </Link>
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-card/60 p-6 shadow-xl backdrop-blur-xl backdrop-saturate-150 duration-700 sm:p-8">
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
              <p className="text-sm text-muted-foreground">Register as a recruiter to get started.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} disabled={isLoading} />
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="recruiter@company.com" {...field} disabled={isLoading} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} disabled={isLoading} />
                      </FormControl>
                      <PasswordChecklist password={password} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="h-10 w-full font-semibold" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}