import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
  await page.getByPlaceholder("recruiter@company.com").fill(process.env.E2E_UI_OWNER_EMAIL!);
  await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
}

test("landing preview works on desktop and mobile without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Great people.");
  await page.getByRole("button", { name: "04Decision" }).click();
  await expect(page.getByText("Close the loop with confidence.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "04Decision" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "audit-artifacts/landing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "01Applied" }).click();
  await expect(page.getByText("Every application, in one place.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "audit-artifacts/landing-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Create your workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test.describe("workspace interaction feedback", () => {
  test.skip(process.env.E2E_AUDIT_DB !== "true", "Requires the isolated local fixtures");
  test("main workspace screens render at mobile width without page overflow", async ({ page }) => {
    await login(page);
    await page.screenshot({ path: "audit-artifacts/overview-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/dashboard", "/dashboard/jobs", "/dashboard/jobs/create", "/dashboard/candidates", "/dashboard/interviews", "/dashboard/team", "/dashboard/settings", "/dashboard/audit"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Something went wrong", exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      expect(await page.locator("#main-content").evaluate(element => element.scrollWidth <= element.clientWidth), path).toBe(true);
    }
  });
  test("server forms show pending feedback and mobile navigation supports Escape", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/clients");
    await page.route("**/dashboard/clients", async route => {
      if (route.request().method() === "POST") await new Promise(resolve => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.getByLabel("Company name").fill("Loading Feedback Client");
    await page.getByRole("button", { name: "Add client", exact: true }).click();
    const busy = page.getByRole("button", { name: "Adding client…", exact: true });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("heading", { name: "Loading Feedback Client", exact: true })).toBeVisible();
    await page.goto("/dashboard/billing");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const openMenu = page.getByRole("button", { name: "Open navigation menu", exact: true });
    await openMenu.click();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
    await expect(openMenu).toBeFocused();
    await page.screenshot({ path: "audit-artifacts/billing-mobile.png", fullPage: true });
  });

  test("candidate search ignores a late response and recovers after a network error", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/candidates");
    const search = page.getByRole("textbox", { name: "Search candidates" });
    await expect(page.getByRole("link", { name: "Browser Audit Candidate", exact: true })).toBeVisible();
    let releaseOld!: () => void;
    const gate = new Promise<void>(resolve => { releaseOld = resolve; });
    let started!: () => void;
    const oldStarted = new Promise<void>(resolve => { started = resolve; });
    await page.route("**/dashboard/candidates", async route => {
      const body = route.request().postData() ?? "";
      if (body.includes("zzzzmissing")) { started(); await gate; }
      if (body.includes("Browser")) await new Promise(resolve => setTimeout(resolve, 1200));
      if (body.includes("networkfailure")) { await route.abort("failed"); return; }
      await route.continue();
    });
    await search.fill("zzzzmissing");
    await oldStarted;
    await search.fill("Browser");
    // Server Actions may be serialized. Change the input before letting the old
    // response finish, then keep the newer response slow enough to inspect the UI.
    await page.waitForTimeout(400);
    const oldResponse = page.waitForResponse(response => response.url().includes("/dashboard/candidates") && (response.request().postData() ?? "").includes("zzzzmissing"));
    releaseOld();
    await oldResponse;
    await expect(page.getByRole("link", { name: "Browser Audit Candidate", exact: true })).toBeVisible();
    await search.fill("networkfailure");
    await expect(page.getByText("Search could not load. Please try again.", { exact: true })).toBeVisible();
    await search.fill("Browser");
    await expect(page.getByRole("link", { name: "Browser Audit Candidate", exact: true })).toBeVisible();
  });
});
