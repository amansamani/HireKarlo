import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {}

    const path = join(uploadDir, uniqueFilename);
    
    const destinationStream = createWriteStream(path);
    
    const nodeReadableStream = Readable.fromWeb(file.stream() as any);
    nodeReadableStream.pipe(destinationStream);
    
    await finished(destinationStream);

    return NextResponse.json({ url: `/uploads/${uniqueFilename}` });
  } catch (error) {
    console.error("Upload stream error:", error);
    return NextResponse.json({ error: "Upload processing failed." }, { status: 500 });
  }
}