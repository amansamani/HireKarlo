import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
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

  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try { const result = await parser.getText(); return result.text; }
    finally { await parser.destroy(); }
  }

  if (ext === "docx") {
    assertSafeDocx(buffer);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return "";
}
