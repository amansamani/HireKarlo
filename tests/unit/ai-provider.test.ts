import { describe, expect, it, vi, afterEach } from "vitest";
import { scoreResumeAgainstJob } from "@/lib/score-resume";
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("Gemini response contract",()=>{
  const valid={skills:["PostgreSQL"],yearsExperience:3,matchScore:82,suggestedStage:"SCREENING",summary:"Relevant database experience."};
  function response(value:unknown){return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]});}
  it("accepts bounded structured output and sends the key in a header",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-test-key");const fetcher=vi.fn(async()=>response(valid));vi.stubGlobal("fetch",fetcher);
    expect(await scoreResumeAgainstJob("Resume","Engineer","Build services")).toEqual(valid);
    const [url,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(url).not.toContain("mock-test-key");expect(options.headers).toEqual(expect.objectContaining({"x-goog-api-key":"mock-test-key"}));expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it("rejects invalid scores, excessive output and arbitrary stages",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-test-key");vi.spyOn(console,"error").mockImplementation(()=>{});
    for(const invalid of [{...valid,matchScore:101},{...valid,matchScore:2.5},{...valid,summary:"x".repeat(1001)},{...valid,suggestedStage:"HIRED"},{...valid,yearsExperience:-1}]){
      vi.stubGlobal("fetch",vi.fn(async()=>response(invalid)));expect(await scoreResumeAgainstJob("Resume","Role","Job")).toBeNull();
    }
  });
  it("degrades safely on provider failures without logging their body",async()=>{
    vi.stubEnv("GEMINI_API_KEY","mock-test-key");const spy=vi.spyOn(console,"error").mockImplementation(()=>{});vi.stubGlobal("fetch",vi.fn(async()=>new Response("private resume and provider quota token",{status:429})));
    expect(await scoreResumeAgainstJob("Resume","Role","Job")).toBeNull();expect(JSON.stringify(spy.mock.calls)).not.toContain("private resume");
    vi.stubGlobal("fetch",vi.fn(async()=>{throw new DOMException("private URL","TimeoutError");}));expect(await scoreResumeAgainstJob("Resume","Role","Job")).toBeNull();
  });
  it("skips provider calls when disabled or resume text is empty",async()=>{
    vi.stubEnv("GEMINI_API_KEY","");vi.spyOn(console,"error").mockImplementation(()=>{});const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);expect(await scoreResumeAgainstJob("Resume","Role","Job")).toBeNull();expect(await scoreResumeAgainstJob(" ","Role","Job")).toBeNull();expect(fetcher).not.toHaveBeenCalled();
  });
});
