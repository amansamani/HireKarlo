// Keep parser dependencies in deployment tracing; document parsing runs only in the worker.
import "mammoth";
import "pdf-parse";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { assertSafeDocx } from "@/lib/docx-validation";
import { getResumeDownloadUrl } from "@/lib/resume-storage";

export async function extractResumeText(fileUrl: string): Promise<string> {
  // fileUrl is now a Cloudinary secure_url (e.g. "https://res.cloudinary.com/.../resumes/xxx.pdf")
  const response = await fetch(await getResumeDownloadUrl(fileUrl), { signal: AbortSignal.timeout(15_000), redirect: "error" });
  if (!response.ok) {
    throw new Error(`Failed to download resume: ${response.status} ${response.statusText}`);
  }

  if (Number(response.headers.get("content-length")) > 3 * 1024 * 1024) throw new Error("Resume exceeds size limit");
  if (!response.body) throw new Error("Empty resume response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > 3 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error("Resume exceeds size limit"); }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const ext = fileUrl.split(".").pop()?.toLowerCase();

  if (ext !== "pdf" && ext !== "docx") return "";
  if (ext === "docx") assertSafeDocx(buffer);
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), "scripts/parse-resume-worker.mjs"), { workerData: { bytes: buffer, extension: ext }, resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32 } });
    let settled = false;
    const finish = (error?: Error, text?: string) => {
      if (settled) return; settled = true; clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error); else resolve(text ?? "");
    };
    const timer = setTimeout(() => finish(new Error("Resume parsing timed out")), 10_000);
    worker.once("message", result => typeof result?.text === "string" ? finish(undefined, result.text) : finish(new Error("Resume parsing failed")));
    worker.once("error", () => finish(new Error("Resume parser unavailable")));
    worker.once("exit", () => { if (!settled) finish(new Error("Resume parser stopped")); });
  });
}
