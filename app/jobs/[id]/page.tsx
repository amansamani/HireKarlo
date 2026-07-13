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
      setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
      return;
    }
    if (!email || !email.includes("@")) {
      setErrors((prev) => ({ ...prev, email: "Please provide a valid email address" }));
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
      <div className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
        <Card className="w-full max-w-md space-y-4 p-6 text-center shadow-xl">
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
            </span>
          </div>
          <CardTitle className="text-xl font-semibold">Application Received!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your profile and resume have entered our evaluation pipeline. We&apos;ll be in touch by email.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Join Our Team</CardTitle>
            <CardDescription>Submit your details and upload your resume below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="candidateName" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <User className="h-3 w-3" aria-hidden="true" /> Full Name
                </label>
                <Input id="candidateName" name="candidateName" placeholder="Aman Samani" required aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="candidateEmail" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Mail className="h-3 w-3" aria-hidden="true" /> Email Address
                </label>
                <Input id="candidateEmail" name="candidateEmail" type="email" placeholder="aman@example.com" required aria-invalid={!!errors.email} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="resume-upload" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3 w-3" aria-hidden="true" /> Curriculum Vitae (PDF)
                </label>
                <div className="relative rounded-lg border border-dashed border-border bg-background/60 p-4 text-center transition-colors hover:border-primary/50">
                  <input
                    id="resume-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    disabled={uploading}
                    aria-describedby="resume-upload-hint"
                  />

                  {uploading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs text-muted-foreground">Uploading your document...</p>
                    </div>
                  ) : fileName ? (
                    <div className="flex flex-col items-center justify-center space-y-1 py-1">
                      <FileText className="h-6 w-6 text-success" aria-hidden="true" />
                      <p className="max-w-[220px] truncate text-xs font-medium text-foreground">{fileName}</p>
                      <p id="resume-upload-hint" className="text-[10px] text-muted-foreground">Tap to replace this file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                      <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs font-medium text-foreground">Click or drag PDF resume here</p>
                      <p id="resume-upload-hint" className="text-[10px] text-muted-foreground">Max size allowed up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={uploading} className="mt-2 w-full font-semibold">
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}