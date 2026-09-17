import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { validWebhookSignature } from "@/lib/billing-provider";
import { effectivePlan } from "@/lib/plans";
import { canEditPipeline } from "@/lib/roles";
import { verifyEmailTemplate } from "@/lib/email-templates";

describe("billing authorization", () => {
  const now = Date.UTC(2026,8,16,12);
  const body = '{"id":"evt_test"}';
  const secret = "test-secret";
  const time = String(now/1000);
  const signature = `t=${time},v1=${createHmac("sha256",secret).update(`${time}.${body}`).digest("hex")}`;
  it("accepts a current signature and rejects changed payloads", () => {
    expect(validWebhookSignature(body,signature,secret,now)).toBe(true);
    expect(validWebhookSignature(body+" ",signature,secret,now)).toBe(false);
  });
  it("rejects stale, future, missing and malformed signatures", () => {
    expect(validWebhookSignature(body,signature,secret,now+301_000)).toBe(false);
    expect(validWebhookSignature(body,signature,secret,now-301_000)).toBe(false);
    expect(validWebhookSignature(body,null,secret,now)).toBe(false);
    expect(validWebhookSignature(body,`t=${time},v1=xyz`,secret,now)).toBe(false);
  });
  it("requires a verified active plan and future period end", () => {
    const trial = new Date(now+86_400_000);
    const active = {plan:"STARTER",status:"active",currentPeriodEnd:trial};
    expect(effectivePlan(active,trial,new Date(now))?.id).toBe("STARTER");
    expect(effectivePlan({...active,status:"past_due"},trial,new Date(now))).toBeNull();
    expect(effectivePlan({...active,plan:"toString"},trial,new Date(now))).toBeNull();
    expect(effectivePlan({...active,currentPeriodEnd:new Date(now)},trial,new Date(now))).toBeNull();
    expect(effectivePlan(null,trial,new Date(now))?.id).toBe("TRIAL");
    expect(effectivePlan(null,new Date(now-1),new Date(now))).toBeNull();
  });
  it("denies unknown and missing roles", () => {
    for(const role of ["", "admin", "SUPERUSER", "INTERVIEWER"]) expect(canEditPipeline(role)).toBe(false);
  });
  it("renders user-controlled names as text in transactional emails", () => {
    const html=verifyEmailTemplate('<img src=x onerror="alert(1)">',"https://example.test/verify").html;
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
