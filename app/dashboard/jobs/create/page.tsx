"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin, Building2, AlignLeft, Loader2, Clock, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createJobAction } from "@/actions/create-job";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function CreateJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Full-time");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    startTransition(async () => {
      const res = await createJobAction({ title, department, location, type, description });

      setLoading(false);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success);
        router.push("/dashboard/jobs");
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/jobs"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to job openings"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Create New Position</h2>
          <p className="text-sm text-muted-foreground">Publish a new opening to your public application link.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <label htmlFor="job-title" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Briefcase className="h-3 w-3" aria-hidden="true" /> Job Title
          </label>
          <Input
            id="job-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., MERN Stack Engineer"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="job-department" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3 w-3" aria-hidden="true" /> Department
            </label>
            <Input
              id="job-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Engineering"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="job-location" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" /> Location
            </label>
            <Input
              id="job-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Gorakhpur, UP"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="job-type" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" /> Employment Type
          </label>
          <div className="relative">
            <select
              id="job-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 pr-8 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Remote">Remote</option>
              <option value="Contract">Contract</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="job-description" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlignLeft className="h-3 w-3" aria-hidden="true" /> Role Summary / Description
          </label>
          <Textarea
            id="job-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide information regarding expectations, skills requirement..."
            rows={4}
            className="resize-none"
            required
          />
        </div>

        <Button type="submit" disabled={loading} className="mt-2 w-full gap-2 text-xs font-semibold">
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Publishing Position...
            </>
          ) : (
            "Publish Opening"
          )}
        </Button>
      </form>
    </div>
  );
}