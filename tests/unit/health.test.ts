import { afterEach, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{$queryRaw:state.query}}));
import { GET } from "@/app/api/health/route";
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();state.query.mockReset();});
describe("readiness failure responses",()=>{
  function configure(){vi.stubEnv("DATABASE_URL","postgresql://private");vi.stubEnv("AUTH_SECRET","x".repeat(32));vi.stubEnv("NEXT_PUBLIC_APP_URL","https://public.example");vi.spyOn(console,"error").mockImplementation(()=>{});}
  it("returns 503 without querying when required environment is missing",async()=>{configure();vi.stubEnv("AUTH_SECRET","");const response=await GET();expect(response.status).toBe(503);expect(await response.json()).toEqual({status:"unavailable"});expect(state.query).not.toHaveBeenCalled();});
  it("returns a generic non-cacheable failure without leaking connection information",async()=>{configure();state.query.mockRejectedValue(new Error("postgresql://secret@private-server"));const response=await GET();expect(response.status).toBe(503);expect(await response.text()).not.toContain("secret");expect(response.headers.get("Cache-Control")).toContain("no-store");});
  it("reports core readiness after a successful database query",async()=>{configure();state.query.mockResolvedValue([{value:1}]);const response=await GET();expect(response.status).toBe(200);expect(await response.json()).toEqual({status:"ok"});});
});
