"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { ArrowLeft, MailCheck, KeyRound, Loader2, ArrowRight } from "lucide-react";

// ✅ FIXED import
import { requestPasswordResetAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const Schema = z.object({ email: z.string().email("Invalid email address") });

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof Schema>) {
    setIsLoading(true);
    const res = await requestPasswordResetAction(values); // ✅ FIXED call
    setIsLoading(false);
    if (res?.error) toast.error(res.error);
    else setSentTo(values.email);
  }

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image src="/hero-bg.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background" />
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          {sentTo ? (
            <div className="relative z-10 space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  We sent a password reset link to{" "}
                  <span className="font-semibold text-foreground">{sentTo}</span>. The link
                  expires in 30 minutes.
                </p>
              </div>
              <Link href="/login" className="block">
                <Button className="group h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20">
                  Back to login
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="relative z-10 space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-background/50">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
                <p className="text-sm text-muted-foreground">
                  No worries — we&apos;ll email you a reset link.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                  </Button>
                </form>
              </Form>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}