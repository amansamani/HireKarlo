import { inflateRawSync } from "zlib";

// Verify actual expansion before a document parser allocates archive contents.
export function assertSafeDocx(buffer: Buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6)) throw new Error("Invalid DOCX archive");
  const count = buffer.readUInt16LE(end + 10), directorySize = buffer.readUInt32LE(end + 12), directory = buffer.readUInt32LE(end + 16);
  if (!count || count > 2_000 || buffer.readUInt16LE(end + 8) !== count || end + 22 + buffer.readUInt16LE(end + 20) !== buffer.length || directory + directorySize !== end) throw new Error("DOCX archive limit exceeded");
  let offset = directory, expanded = 0;
  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > directory + directorySize || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid DOCX directory");
    const flags = buffer.readUInt16LE(offset + 8), method = buffer.readUInt16LE(offset + 10), compressedSize = buffer.readUInt32LE(offset + 20), declaredSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28), extraLength = buffer.readUInt16LE(offset + 30), commentLength = buffer.readUInt16LE(offset + 32), local = buffer.readUInt32LE(offset + 42);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > directory + directorySize || flags & 1 || ![0, 8].includes(method) || declaredSize > 8 * 1024 * 1024) throw new Error("Unsupported DOCX archive entry");
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || names.has(name) || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..")) throw new Error("Unsafe DOCX archive path");
    names.add(name);
    if (local + 30 > directory || buffer.readUInt32LE(local) !== 0x04034b50) throw new Error("Invalid DOCX entry");
    const dataOffset = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const localName = buffer.subarray(local + 30, local + 30 + buffer.readUInt16LE(local + 26)).toString("utf8");
    if (localName !== name || buffer.readUInt16LE(local + 6) !== flags || buffer.readUInt16LE(local + 8) !== method) throw new Error("Inconsistent DOCX entry");
    if (dataOffset + compressedSize > directory) throw new Error("Invalid DOCX data length");
    const packed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const data = method === 8 ? inflateRawSync(packed, { maxOutputLength: 8 * 1024 * 1024 }) : packed;
    expanded += data.length;
    if (data.length !== declaredSize || expanded > 20 * 1024 * 1024) throw new Error("DOCX expansion limit exceeded");
    if (name.endsWith(".xml") && /<!DOCTYPE|<!ENTITY/i.test(data.toString("utf8"))) throw new Error("Unsafe DOCX XML declaration");
    offset = next;
  }
  if (offset !== directory + directorySize) throw new Error("Invalid DOCX directory length");
  if (!["[Content_Types].xml", "_rels/.rels", "word/document.xml"].every(name => names.has(name))) throw new Error("Not a DOCX document");
}
