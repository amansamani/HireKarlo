"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Building2,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  Eye,
  Loader2,
} from "lucide-react";

// ✅ FIXED — createJobAction lives in create-job.ts
import { createJobAction } from "@/actions/create-job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"] as const;

const CreateJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  department: z.string().min(2, "Department is required"),
  location: z.string().min(2, "Location is required"),
  type: z.enum(JOB_TYPES),
  description: z.string().min(30, "Description must be at least 30 characters"),
});

export default function CreateJobPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof CreateJobSchema>>({
    resolver: zodResolver(CreateJobSchema),
    defaultValues: { title: "", department: "", location: "", type: "FULL_TIME", description: "" },
  });

  const preview = form.watch();
  const descLength = preview.description?.length ?? 0;

  async function onSubmit(values: z.infer<typeof CreateJobSchema>) {
    setIsLoading(true);
    const res = await createJobAction(values);
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Job posted! Share the public link to start collecting resumes.");
      router.push("/dashboard/jobs");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/jobs"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-card/50 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50"
          aria-label="Back to jobs"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Position</h2>
          <p className="text-sm text-muted-foreground">Post a new opening and get a public apply link instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Basic Information</h3>
                    <p className="text-xs text-muted-foreground">What are you hiring for?</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Senior Frontend Engineer" className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Engineering" className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai / Remote" className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 border border-chart-2/20">
                    <Clock className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Employment Type</h3>
                    <p className="text-xs text-muted-foreground">How will they work with you?</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-wrap gap-2">
                        {JOB_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => field.onChange(t)}
                            className={cn(
                              "rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all duration-200",
                              field.value === t
                                ? "border-primary/40 bg-primary/10 text-primary shadow-sm scale-[1.03]"
                                : "border-border/40 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            {t.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 border border-warning/20">
                    <FileText className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Job Description</h3>
                    <p className="text-xs text-muted-foreground">Gemini scores every resume against this text — be specific.</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea
                          placeholder={"Responsibilities, requirements, tech stack, nice-to-haves...\n\nThe more detail you provide, the better the AI match scores will be."}
                          rows={8}
                          className="w-full rounded-xl border border-border/60 bg-background/50 p-4 text-sm transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:outline-none resize-y"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span className={cn("text-[11px] font-mono", descLength >= 30 ? "text-success" : "text-muted-foreground")}>
                          {descLength} / 30+ chars
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="group h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.01] sm:w-auto sm:px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Posting job...
                </>
              ) : (
                <>
                  Post Job & Get Link
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Live preview */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Live preview
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> OPEN
              </span>
              <div>
                <h4 className="text-lg font-bold tracking-tight text-foreground">{preview.title || "Job title preview"}</h4>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1"><Building2 className="h-3 w-3" /> {preview.department || "Department"}</span>
                  <span className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1"><MapPin className="h-3 w-3" /> {preview.location || "Location"}</span>
                  <span className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1"><Clock className="h-3 w-3" /> {preview.type.replace("_", " ").toLowerCase()}</span>
                </div>
              </div>
              <p className="line-clamp-5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                {preview.description || "Your job description will appear here exactly as candidates see it on the public apply page."}
              </p>
              <div className="rounded-xl border border-dashed border-border/60 p-3 text-center">
                <p className="text-[11px] font-medium text-foreground">Drop your resume</p>
                <p className="text-[10px] text-muted-foreground">PDF or DOCX · no login required</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex gap-3">
              <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Pro tip:</span> list must-have skills as keywords. Gemini matches resumes against this exact text, so specific requirements = sharper scores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}