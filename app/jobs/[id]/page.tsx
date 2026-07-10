"use client";

import { useState, startTransition, use } from "react";
import { toast } from "sonner";
import { CheckCircle2, User, Mail, UploadCloud, FileText, Loader2 } from "lucide-react";
import { submitApplicationAction } from "@/actions/public-apply";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicJobApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please provide your resume in PDF format only.");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();

      if (data.url) {
        setUploadedUrl(data.url);
        toast.success("Resume uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process resume upload.");
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("candidateName") as string;
    const email = formData.get("candidateEmail") as string;

    if (!name || name.length < 2) {
      setErrors(prev => ({ ...prev, name: "Name must be at least 2 characters" }));
      return;
    }
    if (!email || !email.includes("@")) {
      setErrors(prev => ({ ...prev, email: "Please provide a valid email address" }));
      return;
    }
    if (!uploadedUrl) {
      toast.error("Please upload your resume before submitting.");
      return;
    }

    startTransition(async () => {
      const res = await submitApplicationAction({
        jobId,
        candidateName: name,
        candidateEmail: email,
        resumeUrl: uploadedUrl,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Applied successfully!");
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-center p-6 space-y-4 shadow-xl">
          <div className="flex justify-center"><CheckCircle2 className="h-12 w-12 text-emerald-400 stroke-[1.5]" /></div>
          <CardTitle className="text-xl font-semibold">Application Received!</CardTitle>
          <p className="text-sm text-zinc-400">Your profile along with your resume has entered our evaluation pipeline.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-zinc-50">Join Our Team</CardTitle>
            <CardDescription className="text-zinc-400">Submit your details and upload your resume below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"><User className="h-3 w-3" /> Full Name</label>
                <Input name="candidateName" placeholder="Aman Samani" className="border-zinc-800 bg-zinc-950 text-zinc-100" required />
                {errors.name && <p className="text-xs text-rose-400">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email Address</label>
                <Input name="candidateEmail" type="email" placeholder="aman@example.com" className="border-zinc-800 bg-zinc-950 text-zinc-100" required />
                {errors.email && <p className="text-xs text-rose-400">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"><FileText className="h-3 w-3" /> Curriculum Vitae (PDF)</label>
                <div className="border border-dashed border-zinc-800 rounded-lg p-4 bg-zinc-950/40 text-center hover:border-zinc-700 transition-colors relative">
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
                  
                  {uploading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
                      <p className="text-xs text-zinc-500">Uploading and saving document stream...</p>
                    </div>
                  ) : fileName ? (
                    <div className="flex flex-col items-center justify-center space-y-1 py-1">
                      <FileText className="h-6 w-6 text-emerald-400" />
                      <p className="text-xs text-zinc-200 font-medium max-w-[220px] truncate">{fileName}</p>
                      <p className="text-[10px] text-zinc-500">Tap to replace document file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                      <UploadCloud className="h-6 w-6 text-zinc-500" />
                      <p className="text-xs text-zinc-300 font-medium">Click or drag PDF resume here</p>
                      <p className="text-[10px] text-zinc-500">Max size allowed up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={uploading} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-medium mt-2">
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}