import { describe, expect, it } from "vitest";
import { pipelineStages, nextPipelineStage, isInterviewStage } from "@/lib/pipeline";
import { readBoundedBody } from "@/lib/bounded-body";
import { bearerTokenCandidates, hashBearerToken } from "@/lib/bearer-token";

it("accepts a legacy raw link while rejecting a stored hash as a bearer", () => {
  const raw = "a".repeat(64), hash = hashBearerToken(raw);
  expect(bearerTokenCandidates(raw)).toEqual([hash, raw]);
  expect(bearerTokenCandidates(hash)).toEqual([]);
  expect(bearerTokenCandidates(null as unknown as string)).toEqual([]);
});

describe("hiring outcomes and historical visibility", () => {
  it("moves an offer to hired and never treats rejection as success progression", () => {
    const stages = pipelineStages(["Technical", "HR"]);
    expect(nextPipelineStage("OFFER", stages)).toBe("HIRED");
    expect(nextPipelineStage("HIRED", stages)).toBeNull();
    expect(nextPipelineStage("REJECTED", stages)).toBeNull();
    expect(isInterviewStage("HIRED")).toBe(false);
  });
  it("keeps every existing stage visible and removes reserved/duplicate round names", () => {
    const stages = pipelineStages(["Interview", "Interview", "HIRED", "REJECTED"], ["SCREENING", "TECHNICAL", "HIRED", "legacy"]);
    expect(stages).toEqual(["APPLIED", "Interview", "SCREENING", "TECHNICAL", "legacy", "OFFER", "HIRED", "REJECTED"]);
  });
});

describe("actual request size bounds", () => {
  it("rejects a chunked oversized body without a content-length header", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6)); controller.close(); } });
    const request = new Request("https://example.test/upload", { method: "POST", body, duplex: "half" } as RequestInit);
    await expect(readBoundedBody(request, 10)).rejects.toThrow("Request too large");
  });
  it("accepts a body at the boundary and rejects an oversized declared length", async () => {
    expect(await readBoundedBody(new Request("https://example.test", { method: "POST", body: "12345" }), 5)).toHaveLength(5);
    await expect(readBoundedBody(new Request("https://example.test", { method: "POST", body: "x", headers: { "content-length": "100" } }), 5)).rejects.toThrow();
  });
});
