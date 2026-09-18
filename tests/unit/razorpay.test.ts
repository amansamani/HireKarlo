import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { validRazorpaySignature, validRazorpayCheckoutSignature, safeRazorpayUrl, razorpayCredentials, validatedRazorpayPlan } from "@/lib/razorpay";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Razorpay boundaries", () => {
  it("checks subscription callback signatures using the stored subscription ID", () => {
    const signature = createHmac("sha256", "synthetic-key-secret").update("pay_test|sub_stored").digest("hex");
    expect(validRazorpayCheckoutSignature("pay_test", "sub_stored", signature, "synthetic-key-secret")).toBe(true);
    expect(validRazorpayCheckoutSignature("pay_test", "sub_other", signature, "synthetic-key-secret")).toBe(false);
    expect(validRazorpayCheckoutSignature("pay_changed", "sub_stored", signature, "synthetic-key-secret")).toBe(false);
  });
  it("verifies the exact signed bytes and rejects tampering and malformed signatures", () => {
    const body = Buffer.from('{"event":"subscription.charged"}');
    const signature = createHmac("sha256", "test-webhook-secret").update(body).digest("hex");
    expect(validRazorpaySignature(body, signature, "test-webhook-secret")).toBe(true);
    expect(validRazorpaySignature(Buffer.from(body.toString() + " "), signature, "test-webhook-secret")).toBe(false);
    expect(validRazorpaySignature(body, "abc", "test-webhook-secret")).toBe(false);
    expect(validRazorpaySignature(body, signature, "different")).toBe(false);
  });
  it("rejects unsafe checkout redirects", () => {
    expect(safeRazorpayUrl("https://rzp.io/i/example")).toBe("https://rzp.io/i/example");
    for (const url of ["http://rzp.io/i/x", "https://rzp.io.evil.test/x", "https://user@rzp.io/x", "javascript:alert(1)", "https://rzp.io:444/x"]) expect(() => safeRazorpayUrl(url)).toThrow();
  });
  it("fails closed when live keys are placed in test configuration", () => {
    vi.stubEnv("RAZORPAY_MODE", "test"); vi.stubEnv("RAZORPAY_KEY_ID", "rzp_live_example"); vi.stubEnv("RAZORPAY_KEY_SECRET", "synthetic");
    expect(() => razorpayCredentials()).toThrow();
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_example"); expect(razorpayCredentials().mode).toBe("test");
  });
  it("validates the actual provider price, currency and interval", async () => {
    vi.stubEnv("RAZORPAY_MODE", "test"); vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_example"); vi.stubEnv("RAZORPAY_KEY_SECRET", "synthetic"); vi.stubEnv("RAZORPAY_PLAN_STARTER_INR", "plan_test");
    const remote = { id: "plan_test", period: "monthly", interval: 1, item: { currency: "INR", amount: 149900 } };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(remote)));
    expect(await validatedRazorpayPlan("STARTER")).toBe("plan_test");
    remote.item.amount = 1; await expect(validatedRazorpayPlan("STARTER")).rejects.toThrow("price mismatch");
    remote.item.amount = 149900; remote.item.currency = "USD"; await expect(validatedRazorpayPlan("STARTER")).rejects.toThrow("price mismatch");
    remote.item.currency = "INR"; remote.period = "yearly"; await expect(validatedRazorpayPlan("STARTER")).rejects.toThrow("price mismatch");
  });
});
