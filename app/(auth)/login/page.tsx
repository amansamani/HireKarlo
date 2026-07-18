"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { KanbanSquare, Sparkles, MailCheck } from "lucide-react";

import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthBrandPanel } from "@/components/layout/auth-brand-panel";
import { PasswordInput } from "@/components/ui/password-input";

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
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[url(/hero-bg.webp)] bg-cover bg-top bg-no-repeat"
        aria-hidden="true"
      />
      <AuthBrandPanel
        heading="Welcome back to your pipeline"
        subheading="Every candidate, scored and sorted, waiting where you left them."
        points={[
          { icon: KanbanSquare, text: "Kanban pipeline across every open role" },
          { icon: Sparkles, text: "AI match scores on every resume" },
          { icon: MailCheck, text: "Candidates notified automatically" },
        ]}
      />

      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-card/60 p-6 shadow-xl backdrop-blur-xl backdrop-saturate-150 duration-700 sm:p-8">
          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">Access your hiring dashboard.</p>
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
              <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-medium text-primary hover:underline underline-offset-4"
                        >
                        Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <Button type="submit" className="h-10 w-full font-semibold" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}