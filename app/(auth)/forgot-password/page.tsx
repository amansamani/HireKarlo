"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { KanbanSquare, Sparkles, MailCheck } from "lucide-react";

import { requestPasswordResetAction } from "@/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { cn } from "@/lib/utils";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof ForgotPasswordSchema>) {
    setIsLoading(true);
    const res = await requestPasswordResetAction(values);
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      // Same success state whether or not the account exists — the action
      // itself never reveals that, so the UI shouldn't either.
      setSubmitted(true);
    }
  }

  return (
    <div className="relative isolate grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[url(/hero-bg.webp)] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />
      <AuthBrandPanel
        heading="Forgot your password?"
        subheading="No worries — we'll send a reset link straight to your inbox."
        points={[
          { icon: KanbanSquare, text: "Kanban pipeline across every open role" },
          { icon: Sparkles, text: "AI match scores on every resume" },
          { icon: MailCheck, text: "Candidates notified automatically" },
        ]}
      />

      <div className="flex items-center justify-center p-4 sm:p-8">
        {submitted ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-card/60 p-6 text-center shadow-xl backdrop-blur-xl backdrop-saturate-150 duration-700 sm:p-8">
            <MailCheck className="mx-auto size-10 text-primary" />
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, a password reset link is on its way. It expires in 1 hour.
              </p>
            </div>
            <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }), "h-10 w-full")}>
              Back to login
            </Link>
          </div>
        ) : (
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-card/60 p-6 shadow-xl backdrop-blur-xl backdrop-saturate-150 duration-700 sm:p-8">
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
              <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Button type="submit" className="h-10 w-full font-semibold" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
                Back to login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}