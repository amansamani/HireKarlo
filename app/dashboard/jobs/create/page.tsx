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
  Plus,
  X,
  GripVertical,
  ListChecks,
} from "lucide-react";

import { createJobAction } from "@/actions/create-job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "REMOTE"] as const;

const CreateJobSchema = z.object({
  title: z.string().min(1, "Job title is required").max(100),
  department: z.string().min(1, "Department is required").max(50),
  location: z.string().min(1, "Location is required").max(100),
  type: z.string().min(1, "Employment type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

const DEFAULT_ROUNDS = ["Phone Screen", "Technical Round", "HR Round"];

export default function CreateJobPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Custom rounds — plain state (Applied / Offer / Rejected are auto-added)
  const [rounds, setRounds] = useState<string[]>(DEFAULT_ROUNDS);
  const [newRound, setNewRound] = useState("");

  const form = useForm<z.infer<typeof CreateJobSchema>>({
    resolver: zodResolver(CreateJobSchema),
    defaultValues: {
      title: "",
      department: "",
      location: "",
      type: "FULL_TIME",
      description: "",
    },
  });

  const preview = form.watch();
  const descLength = preview.description?.length ?? 0;

  function updateRound(index: number, value: string) {
    setRounds((r) => r.map((item, i) => (i === index ? value : item)));
  }

  function addRound() {
    const trimmed = newRound.trim();
    if (!trimmed) return toast.error("Round name can't be empty.");
    if (rounds.includes(trimmed)) return toast.error("That round already exists.");
    setRounds((r) => [...r, trimmed]);
    setNewRound("");
  }

  function removeRound(index: number) {
    setRounds((r) => r.filter((_, i) => i !== index));
  }

  async function onSubmit(values: z.infer<typeof CreateJobSchema>) {
    setIsLoading(true);
    const res = await createJobAction({ ...values, interviewRounds: rounds });
    setIsLoading(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Job posted! Share the public link to start collecting resumes.");
      router.push("/dashboard/jobs");
      router.refresh();
    }
  }

  const finalPipeline = ["Applied", ...(rounds.length > 0 ? rounds : ["Interview"]), "Offer", "Rejected"];

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
          <p className="text-sm text-muted-foreground">
            Post a new opening with your own custom interview pipeline.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* ─── Form column ─── */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic info */}
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
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
                      <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Job Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Senior Frontend Engineer"
                          className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                          {...field}
                        />
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
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Department
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Engineering"
                            className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                            {...field}
                          />
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
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Location
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Mumbai / Remote"
                            className="h-12 rounded-xl border-border/60 bg-background/50 transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Employment type */}
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10 border border-chart-2/20">
                    <Clock className="h-5 w-5 text-chart-2" aria-hidden="true" />
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

            {/* ✅ Custom interview rounds */}
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 border border-warning/20">
                    <ListChecks className="h-5 w-5 text-warning" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Interview Pipeline</h3>
                    <p className="text-xs text-muted-foreground">
                      Define the stages between Applied and Offer.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {rounds.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/60 bg-background/30 p-4 text-center text-xs text-muted-foreground">
                      No custom rounds — the default pipeline will be used:
                      <span className="mt-1 block font-semibold text-foreground">
                        Applied → Interview → Offer → Rejected
                      </span>
                    </div>
                  )}
                  {rounds.map((round, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <Input
                        value={round}
                        onChange={(e) => updateRound(index, e.target.value)}
                        className="h-8 flex-1 border-0 bg-transparent p-0 text-sm font-medium focus-visible:ring-0"
                        aria-label={`Interview round ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRound(index)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove round ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Input
                    value={newRound}
                    onChange={(e) => setNewRound(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRound();
                      }
                    }}
                    placeholder="Add a round (e.g. System Design, Culture Fit)"
                    className="h-10 flex-1 rounded-xl border-border/60 bg-background/50 text-sm focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRound}
                    className="h-10 gap-1.5 rounded-xl text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Applied</span>,{" "}
                  <span className="font-semibold text-foreground">Offer</span> and{" "}
                  <span className="font-semibold text-foreground">Rejected</span> are always
                  included automatically. Add your own interview rounds in between — or leave it
                  empty for the default: Applied → Interview → Offer → Rejected.
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-sm">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 border border-success/20">
                    <FileText className="h-5 w-5 text-success" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Job Description</h3>
                    <p className="text-xs text-muted-foreground">
                      Gemini scores every resume against this text — be specific.
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea
                          placeholder={
                            "Responsibilities, requirements, tech stack, nice-to-haves...\n\nThe more detail you provide, the better the AI match scores will be."
                          }
                          rows={8}
                          className="w-full resize-y rounded-xl border border-border/60 bg-background/50 p-4 text-sm transition-all focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span
                          className={cn(
                            "text-[11px] font-mono",
                            descLength >= 10 ? "text-success" : "text-muted-foreground"
                          )}
                        >
                          {descLength} / 10+ chars
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
              className="group h-12 w-full rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] hover:shadow-primary/30 sm:w-auto sm:px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Posting job...
                </>
              ) : (
                <>
                  Post Job & Get Link
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* ─── Live preview column ─── */}
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Live preview
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-background p-6 shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> OPEN
              </span>

              <div>
                <h4 className="text-lg font-bold tracking-tight text-foreground">
                  {preview.title || "Job title preview"}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1">
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    {preview.department || "Department"}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {preview.location || "Location"}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-muted/50 px-2 py-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {preview.type.replace("_", " ").toLowerCase()}
                  </span>
                </div>
              </div>

              <p className="line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                {preview.description ||
                  "Your job description will appear here exactly as candidates see it on the public apply page."}
              </p>

              {/* ✅ Final pipeline preview */}
              <div className="border-t border-border/40 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Final pipeline
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {finalPipeline.map((r, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          r === "Applied" && "border-chart-2/30 bg-chart-2/10 text-chart-2",
                          r === "Offer" && "border-success/30 bg-success/10 text-success",
                          r === "Rejected" && "border-destructive/30 bg-destructive/10 text-destructive",
                          r !== "Applied" &&
                            r !== "Offer" &&
                            r !== "Rejected" &&
                            "border-primary/20 bg-primary/5 text-foreground"
                        )}
                      >
                        {r}
                      </span>
                      {i < finalPipeline.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Pro tip:</span> specific round
                names like &quot;System Design (60min)&quot; produce sharper AI scores than
                generic &quot;Technical&quot;.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}