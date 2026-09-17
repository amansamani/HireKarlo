import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const state=vi.hoisted(()=>({decode:vi.fn()}));
vi.mock("next-auth/jwt",()=>({getToken:state.decode}));
import { proxy } from "@/proxy";
afterEach(()=>{state.decode.mockReset();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("read-only navigation authorization",()=>{
  it("keeps public pages public without reading/refreshing session cookies",async()=>{
    const response=await proxy(new NextRequest("https://example.test/login"));expect(response.status).toBe(200);expect(state.decode).not.toHaveBeenCalled();expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("redirects protected navigation without a valid identity",async()=>{
    vi.stubEnv("AUTH_SECRET","mock-only-secret");state.decode.mockResolvedValue(null);const response=await proxy(new NextRequest("https://example.test/dashboard/clients"));expect(response.headers.get("location")).toBe("https://example.test/login");
  });
  it("allows authenticated navigation without rotating the cookie",async()=>{
    vi.stubEnv("AUTH_SECRET","mock-only-secret");state.decode.mockResolvedValue({id:"synthetic-user"});const response=await proxy(new NextRequest("https://example.test/dashboard"));expect(response.status).toBe(200);expect(response.headers.get("set-cookie")).toBeNull();expect(state.decode.mock.calls[0][0].secureCookie).toBe(true);
  });
  it("matches secure-cookie selection behind a trusted HTTPS terminating proxy",async()=>{
    vi.stubEnv("AUTH_SECRET","mock-only-secret");state.decode.mockResolvedValue({id:"synthetic-user"});await proxy(new NextRequest("http://internal/dashboard",{headers:{"x-forwarded-proto":"https"}}));expect(state.decode.mock.calls[0][0].secureCookie).toBe(true);
  });
  it("fails closed on decoding errors and missing secrets",async()=>{
    vi.spyOn(console,"error").mockImplementation(()=>{});vi.stubEnv("AUTH_SECRET","");expect((await proxy(new NextRequest("http://localhost/dashboard"))).headers.get("location")).toBe("http://localhost/login");expect(state.decode).not.toHaveBeenCalled();
    vi.stubEnv("AUTH_SECRET","mock-only-secret");state.decode.mockRejectedValue(new Error("private token"));expect((await proxy(new NextRequest("http://localhost/dashboard"))).headers.get("location")).toBe("http://localhost/login");
  });
});
