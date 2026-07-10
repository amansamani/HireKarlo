"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin, Building2, AlignLeft, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import { createJobAction } from "@/actions/create-job";

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
      const res = await createJobAction({
        title,
        department,
        location,
        type,
        description,
      });

      setLoading(false);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success);
        router.push("/dashboard/jobs"); // Redirect back to pool page
      }
    });
  }

  return (
    <div className="space-y-6 text-zinc-100 max-w-xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jobs" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Create New Position</h2>
          <p className="text-sm text-zinc-400">Deploy a new open listing to your public application framework.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border border-zinc-850 bg-zinc-900/20 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-zinc-500" /> Job Title
          </label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., MERN Stack Engineer" className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-zinc-500" /> Department
            </label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Engineering" className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700" required />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-zinc-500" /> Location
            </label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Gorakhpur, UP" className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-zinc-500" /> Employment Type
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700 color-scheme-dark">
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Remote">Remote</option>
            <option value="Contract">Contract</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <AlignLeft className="h-3 w-3 text-zinc-500" /> Role Summary / Description
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide information regarding expectations, skills requirement..." rows={4} className="w-full text-xs px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-md text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none" required />
        </div>

        <button type="submit" disabled={loading} className="w-full h-9 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing Position...
            </>
          ) : (
            "Publish Opening"
          )}
        </button>
      </form>
    </div>
  );
}