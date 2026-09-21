import { test, expect, type Page } from "@playwright/test";

// A failed scorecard never moves a candidate by itself: it waits for a recruiter/owner decision.
// Fixtures (audit-fixtures.ts) seed three failed rounds that are pending that decision.
test.describe("interview outcome decision", () => {
  test.skip(process.env.E2E_AUDIT_DB !== "true", "Requires explicitly enabled isolated local PostgreSQL fixtures");

  async function login(page: Page, email: string) {
    await page.goto("/login");
    const rejectAnalytics = page.getByRole("button", { name: "Reject analytics", exact: true });
    await rejectAnalytics.click();
    await expect(rejectAnalytics).toHaveCount(0);
    await page.getByPlaceholder("recruiter@company.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page, "Sign-in should reach the dashboard (a \"Too many login attempts\" toast means the per-email login rate limit was hit)").toHaveURL(/\/dashboard(?:\?.*)?$/);
  }
  const interviewCard = (page: Page, candidate: string) =>
    page.locator("div.group").filter({ has: page.getByRole("heading", { name: candidate, exact: true }) });
  const pipelineCard = (page: Page, candidate: string) =>
    page.locator("div.group").filter({ has: page.getByText(candidate, { exact: true }) });

  test("the assigned recruiter is alerted in-app and can confirm the rejection", async ({ page }) => {
    await login(page, process.env.E2E_OWNER_EMAIL!);

    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await page.getByRole("link", { name: /Confirm Flow Candidate did not pass Decision round confirm-flow/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/interviews$/);

    const card = interviewCard(page, "Confirm Flow Candidate");
    await expect(card.getByText("Result: Failed", { exact: true })).toBeVisible();
    await expect(card.getByText("The candidate has not been contacted.", { exact: false })).toBeVisible();

    // Two-step confirmation: choosing "Confirm rejection" alone must not reject anyone.
    await card.getByRole("button", { name: "Confirm rejection", exact: true }).click();
    await expect(card.getByText("Moves the candidate to Rejected", { exact: false })).toBeVisible();
    await card.getByRole("button", { name: "Back", exact: true }).click();
    await expect(card.getByRole("button", { name: "Confirm rejection", exact: true })).toBeVisible();

    await card.getByRole("button", { name: "Confirm rejection", exact: true }).click();
    await card.getByLabel("Decision note").fill("Not a fit for this role");
    await card.getByRole("button", { name: "Reject & notify candidate", exact: true }).click();
    await expect(card.getByText("Rejection confirmed", { exact: false })).toBeVisible();

    // The decision survives a reload and the candidate is now in the Rejected column.
    await page.reload();
    await expect(interviewCard(page, "Confirm Flow Candidate").getByText("Rejection confirmed", { exact: false })).toBeVisible();
    await page.goto(`/dashboard/jobs/${process.env.E2E_DECISION_JOB_ID}`);
    await expect(pipelineCard(page, "Confirm Flow Candidate").getByRole("button", { name: "Restore" })).toBeVisible();
    await expect(pipelineCard(page, "Confirm Flow Candidate").getByText("decision needed", { exact: false })).toHaveCount(0);
  });

  test("overriding keeps the candidate in the pipeline and clears the decision flag", async ({ page }) => {
    await login(page, process.env.E2E_OWNER_EMAIL!);

    await page.goto(`/dashboard/jobs/${process.env.E2E_DECISION_JOB_ID}`);
    const flagged = pipelineCard(page, "Override Flow Candidate");
    await expect(flagged.getByText("Interview failed — decision needed", { exact: true })).toBeVisible();

    await page.goto("/dashboard/interviews");
    const card = interviewCard(page, "Override Flow Candidate");
    await card.getByRole("button", { name: "Override", exact: true }).click();
    await card.getByLabel("Decision note").fill("Worth a second panel");
    await card.getByRole("button", { name: "Keep in pipeline", exact: true }).click();
    await expect(card.getByText("A recruiter overrode this result.", { exact: false })).toBeVisible();

    await page.goto(`/dashboard/jobs/${process.env.E2E_DECISION_JOB_ID}`);
    const after = pipelineCard(page, "Override Flow Candidate");
    await expect(after.getByText("decision needed", { exact: false })).toHaveCount(0);
    await expect(after.getByRole("button", { name: "Restore" })).toHaveCount(0);   // still an active candidate
  });

  test("an interviewer sees the result is awaiting a decision but has no way to make it", async ({ page }) => {
    await login(page, process.env.E2E_INTERVIEWER_EMAIL!);
    await page.goto("/dashboard/interviews");
    const card = interviewCard(page, "Awaiting Decision Candidate");
    await expect(card.getByText("Awaiting recruiter decision. The candidate has not been contacted.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm rejection", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Override", exact: true })).toHaveCount(0);

    // Pipeline access stays closed to interviewers.
    await page.goto(`/dashboard/jobs/${process.env.E2E_DECISION_JOB_ID}`);
    await expect(page.getByText("Awaiting Decision Candidate", { exact: true })).toHaveCount(0);
  });
});
