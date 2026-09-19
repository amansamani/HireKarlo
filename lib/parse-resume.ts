import { fork } from "node:child_process";
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
  if (ext === "pdf" && (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-")) {
    throw new Error("Resume parsing failed");
  }
  if (ext === "docx") assertSafeDocx(buffer);
  return new Promise<string>((resolve, reject) => {
    const worker = fork(path.join(process.cwd(), "scripts/parse-resume-worker.mjs"), [], {
      execArgv: ["--max-old-space-size=128", "--max-semi-space-size=8"],
      serialization: "advanced",
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let settled = false;
    let result: { error?: Error; text?: string } | null = null;
    const finish = (error?: Error, text?: string, terminate = false) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (terminate) worker.kill();
      if (error) reject(error); else resolve(text ?? "");
    };
    const timer = setTimeout(() => finish(new Error("Resume parsing timed out"), undefined, true), 10_000);
    worker.once("message", message => {
      const parsed = message as { text?: unknown };
      result = typeof parsed?.text === "string" ? { text: parsed.text } : { error: new Error("Resume parsing failed") };
    });
    worker.once("error", () => finish(new Error("Resume parser unavailable")));
    worker.once("exit", () => {
      if (!settled) finish(result?.error ?? (result ? undefined : new Error("Resume parser stopped")), result?.text);
    });
    worker.send({ bytes: buffer, extension: ext }, error => {
      if (error) finish(new Error("Resume parser unavailable"), undefined, true);
    });
  });
}
