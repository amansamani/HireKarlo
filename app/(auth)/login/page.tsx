"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { KanbanSquare, Sparkles, MailCheck, ArrowRight } from "lucide-react";

import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { PasswordInput } from "@/components/ui/password-input";
import Image from "next/image";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified")) {
      toast.success("Email verified — you can log in now.");
    } else if (params.get("verify_error") === "expired_token") {
      toast.error("That verification link expired. Please register again.");
    } else if (params.get("verify_error")) {
      toast.error("That verification link is invalid.");
    }
    if (params.toString()) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function onSubmit(values: z.infer<typeof LoginSchema>) {
    setIsLoading(true);
    const res = await loginAction(values);
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
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
        heading="Welcome back to your pipeline"
        subheading="Every candidate, scored and sorted, waiting where you left them. Jump back into your hiring workflow."
        points={[
          { icon: KanbanSquare, text: "Kanban pipeline across every open role" },
          { icon: Sparkles, text: "AI match scores on every resume" },
          { icon: MailCheck, text: "Candidates notified automatically" },
        ]}
      />

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-8 duration-700">
          {/* Logo for mobile */}
          <Link href="/" className="flex items-center justify-center gap-2 lg:hidden">
            <Image
              src="/logo.webp"
              alt="HireKarlo Logo"
              width={112}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="font-bold tracking-tight">HireKarlo</span>
          </Link>

          <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl backdrop-saturate-150 p-8 shadow-2xl shadow-black/10">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-background/50 backdrop-blur-sm">
                  <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
                <p className="text-sm text-muted-foreground">
                  Access your hiring dashboard
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
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Password
                          </FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <PasswordInput
                            placeholder="••••••••"
                            className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
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
                    className="group h-12 w-full rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.01]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign In
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
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Sign up free
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}