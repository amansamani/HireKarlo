import { describe, expect, it, vi, afterEach } from "vitest";
import { deflateRawSync } from "zlib";
import { assertSafeDocx } from "@/lib/docx-validation";
import { missingRequiredEnvironment } from "@/lib/readiness";
import { logError } from "@/lib/logger";
import { encryptSecret, decryptSecret } from "@/lib/encrypted-secret";

function archive(files: [string, Buffer][], forgedSize?: number) {
  const locals: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const [name, data] of files) {
    const encoded = Buffer.from(name), packed = deflateRawSync(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt16LE(8,8); local.writeUInt32LE(packed.length,18); local.writeUInt32LE(forgedSize ?? data.length,22); local.writeUInt16LE(encoded.length,26);
    locals.push(local,encoded,packed);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20,6); entry.writeUInt16LE(8,10); entry.writeUInt32LE(packed.length,20); entry.writeUInt32LE(forgedSize ?? data.length,24); entry.writeUInt16LE(encoded.length,28); entry.writeUInt32LE(offset,42);
    central.push(entry,encoded); offset += local.length+encoded.length+packed.length;
  }
  const dir = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10); end.writeUInt32LE(dir.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,dir,end]);
}
const minimal = (): [string,Buffer][] => [["[Content_Types].xml",Buffer.from("<Types/>")],["_rels/.rels",Buffer.from("<Relationships/>")],["word/document.xml",Buffer.from("<document/>")]];
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("document upload resource boundaries", () => {
  it("accepts a small DOCX archive structure", () => expect(() => assertSafeDocx(archive(minimal()))).not.toThrow());
  it("rejects a plain ZIP renamed DOCX", () => expect(() => assertSafeDocx(archive([["readme.txt",Buffer.from("hello")]]))).toThrow(/Not a DOCX/));
  it("rejects traversal paths and duplicate names", () => {
    expect(() => assertSafeDocx(archive([...minimal(),["../outside.xml",Buffer.from("x")]]))).toThrow(/Unsafe/);
    expect(() => assertSafeDocx(archive([...minimal(),minimal()[0]]))).toThrow(/Unsafe/);
  });
  it("rejects XML entity declarations before parsing", () => expect(() => assertSafeDocx(archive([["word/document.xml",Buffer.from('<!DOCTYPE doc [<!ENTITY x SYSTEM "file:///secret">]>')],...minimal().slice(0,2)]))).toThrow(/Unsafe DOCX XML/));
  it("bounds actual inflated data even when the directory lies", () => expect(() => assertSafeDocx(archive([["word/document.xml",Buffer.alloc(9*1024*1024,97)]],1))).toThrow());
  it("rejects malformed and truncated archives", () => {
    expect(() => assertSafeDocx(Buffer.from("PK"))).toThrow();
    const valid=archive(minimal()); expect(() => assertSafeDocx(valid.subarray(0,valid.length-8))).toThrow();
  });
  it("rejects conflicting local and directory entry names",()=>{
    const buffer=archive(minimal());buffer[30]=120;expect(()=>assertSafeDocx(buffer)).toThrow(/Inconsistent/);
  });
});
describe("operational confidentiality", () => {
  it("logs safe codes without emails, tokens, provider errors or URLs", () => {
    const spy=vi.spyOn(console,"error").mockImplementation(()=>{});
    logError("database.failed", Object.assign(new Error("postgres://password@private?otp=123456 aman@example.com"),{code:"P2003"}));
    expect(spy.mock.calls).toEqual([[JSON.stringify({level:"error",event:"database.failed",code:"P2003"})]]);
    logError("provider.failed",{code:"https://private.example/secret"}); expect(spy.mock.calls[1][0]).toContain('"code":"UNEXPECTED"');
  });
  it("reports missing configuration by name and requires HTTPS in production", () => {
    expect(missingRequiredEnvironment({})).toEqual(expect.arrayContaining(["DATABASE_URL","AUTH_SECRET","NEXT_PUBLIC_APP_URL"]));
    expect(missingRequiredEnvironment({DATABASE_URL:"private",AUTH_SECRET:"x".repeat(32),NEXT_PUBLIC_APP_URL:"https://hirekarlo.example",NODE_ENV:"production"})).toEqual([]);
    expect(missingRequiredEnvironment({DATABASE_URL:"private",AUTH_SECRET:"short",NEXT_PUBLIC_APP_URL:"http://public.example",NODE_ENV:"production"})).toEqual(expect.arrayContaining(["AUTH_SECRET_MIN_32_CHARACTERS","APP_URL_VALID_HTTPS"]));
  });
  it("detects ciphertext tampering and wrong encryption keys", () => {
    vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY","audit-key-never-use"); const encrypted=encryptSecret("secret-refresh-token"); expect(decryptSecret(encrypted)).toBe("secret-refresh-token");
    const parts=encrypted.split(":"); const tag=Buffer.from(parts[3],"base64url"); tag[0]^=1; parts[3]=tag.toString("base64url"); expect(()=>decryptSecret(parts.join(":"))).toThrow();
    vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY","different-key"); expect(()=>decryptSecret(encrypted)).toThrow();
  });
});
