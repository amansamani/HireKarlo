import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsEvent } from "@/lib/analytics-privacy";
describe("analytics URL minimization",()=>{
  it("drops tokens and identifiers on auth, recruiting and applicant routes",()=>{
    for(const path of ["/reset-password?token=secret","/rate-interview?token=secret","/accept-invite?token=secret","/track","/dashboard/jobs/private-id","/jobs/private-id","/api/resumes/private-id"])
      expect(sanitizeAnalyticsEvent({type:"pageview",url:`https://example.test${path}`})).toBeNull();
  });
  it("strips query strings and fragments on consented marketing views",()=>expect(sanitizeAnalyticsEvent({type:"pageview",url:"https://example.test/pricing?email=private@example.test#private"})).toEqual({type:"pageview",url:"https://example.test/pricing"}));
  it("fails closed on malformed events",()=>expect(sanitizeAnalyticsEvent({type:"event",url:"invalid"})).toBeNull());
});
