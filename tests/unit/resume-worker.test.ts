import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/resume-storage", () => ({ getResumeDownloadUrl: async () => "https://storage.example.test/resume.pdf" }));
import { extractResumeText } from "@/lib/parse-resume";
afterEach(() => vi.unstubAllGlobals());

function samplePdf() {
  const stream = "BT /F1 12 Tf 72 720 Td (Synthetic engineering candidate) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

it("extracts real PDF text in the bounded worker", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(samplePdf())));
  expect(await extractResumeText("https://storage.example.test/resume.pdf")).toContain("Synthetic engineering candidate");
}, 15000);

it("reports a corrupt document without hanging the request", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("broken pdf")));
  await expect(extractResumeText("https://storage.example.test/resume.pdf")).rejects.toThrow("Resume parsing failed");
}, 15000);

it("isolates a malformed PDF that has a valid file signature", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("%PDF-1.4\nbroken\n%%EOF")));
  await expect(extractResumeText("https://storage.example.test/resume.pdf")).rejects.toThrow("Resume parsing failed");
}, 15000);
