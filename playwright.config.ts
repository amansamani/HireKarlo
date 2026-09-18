import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  expect: { timeout: 10000 },
  globalSetup: "./tests/e2e/audit-fixtures.ts",
  globalTeardown: "./tests/e2e/audit-teardown.ts",
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_PRODUCTION === "true" ? "npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: process.env.E2E_AUDIT_DB !== "true" && !process.env.CI,
    env: { EMAIL_USER: "", EMAIL_PASS: "", GEMINI_API_KEY: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", BILLING_PROVIDER: "razorpay", RAZORPAY_MODE: "test", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", RAZORPAY_WEBHOOK_SECRET: "" },
  },
});
