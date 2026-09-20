import { test, expect, type Page } from "@playwright/test";
test.describe("subscription checkout return", () => {
  test.skip(process.env.E2E_AUDIT_DB !== "true", "Requires isolated local database fixtures");
  async function login(page: Page) {
    await page.goto("/login"); await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
    await page.getByPlaceholder("recruiter@company.com").fill(process.env.E2E_BILLING_OWNER_EMAIL!);
    await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Sign In", exact: true }).click(); await expect(page).toHaveURL(/\/dashboard/);
  }
  test("successful browser callback returns to billing without trusting a forged signature", async ({ page }) => {
    await page.route("https://checkout.razorpay.com/v1/checkout.js", route => route.fulfill({ contentType: "application/javascript", body: `window.Razorpay = class { constructor(options) { this.options = options; } on() {} open() { this.options.handler({razorpay_payment_id:'pay_browser',razorpay_subscription_id:'sub_browser',razorpay_signature:'${"0".repeat(64)}'}); } };` }));
    await login(page); await page.goto("/dashboard/billing/checkout");
    await expect(page.getByRole("heading", { name: "Complete your subscription" })).toBeVisible();
    await page.getByRole("button", { name: "Pay with Razorpay", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/billing\?error=review$/);
    await expect(page.locator('p[role="alert"]')).toContainText("reconciliation is pending");
    await expect(page.getByText("No automatic payment.", { exact: false })).toBeVisible();
  });
  test("dismissal preserves the return controls and does not claim payment success", async ({ page }) => {
    await page.route("https://checkout.razorpay.com/v1/checkout.js", route => route.fulfill({ contentType: "application/javascript", body: "window.Razorpay = class { constructor(options) { this.options = options; } on() {} open() { this.options.modal.ondismiss(); } };" }));
    await login(page); await page.goto("/dashboard/billing/checkout");
    await page.getByRole("button", { name: "Pay with Razorpay", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Checkout closed");
    await expect(page.getByRole("button", { name: "Check payment and return", exact: true })).toBeEnabled();
    await page.getByRole("link", { name: "Back to billing", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/billing$/);
  });
  test("checkout shows progress while the payment window is open", async ({ page }) => {
    await page.route("https://checkout.razorpay.com/v1/checkout.js", route => route.fulfill({ contentType: "application/javascript", body: "window.Razorpay = class { constructor(options) { this.options = options; } on() {} open() {} };" }));
    await login(page); await page.goto("/dashboard/billing/checkout");
    await page.getByRole("button", { name: "Pay with Razorpay", exact: true }).click();
    const progress = page.getByRole("button", { name: "Payment in progress…", exact: true });
    await expect(progress).toBeDisabled();
    await expect(progress).toHaveAttribute("aria-busy", "true");
    await expect(progress.locator("svg")).toBeVisible();
    await page.screenshot({ path: "audit-artifacts/checkout-progress.png", fullPage: true });
  });
  test("a failed checkout script stops loading and offers recovery", async ({ page }) => {
    await page.route("https://checkout.razorpay.com/v1/checkout.js", route => route.abort("failed"));
    await login(page); await page.goto("/dashboard/billing/checkout");
    const unavailable = page.getByRole("button", { name: "Checkout unavailable", exact: true });
    await expect(unavailable).toBeDisabled();
    await expect(unavailable).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("button", { name: "Reload checkout", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Check payment and return", exact: true })).toBeEnabled();
  });
});
