import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { readFile } from "fs/promises";
import { join } from "path";

export async function extractResumeText(fileUrl: string): Promise<string> {
  // fileUrl looks like "/uploads/xxx.pdf" — resolve it to the real file on disk
  const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
  const filePath = join(process.cwd(), "public", relativePath);

  const buffer = await readFile(filePath);
  const ext = fileUrl.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (ext === "doc" || ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return "";
}