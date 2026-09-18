import { test, expect } from "@playwright/test";

test("workflow transitions keep the desktop preview steady and remain interactive", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
  const preview = page.locator(".workflow-frame");
  await preview.scrollIntoViewIfNeeded();
  await expect(page.getByText("Every application, in one place.", { exact: true })).toBeVisible();
  const before = await preview.boundingBox();
  await page.getByRole("button", { name: "04Decision" }).click();
  await expect(page.getByText("Close the loop with confidence.", { exact: true })).toBeVisible();
  const after = await preview.boundingBox();
  expect(Math.abs(after!.height - before!.height)).toBeLessThan(2);
  await page.getByRole("button", { name: "02Review" }).click();
  await expect(page.getByText("A clearer shortlist. Your judgment.", { exact: true })).toBeVisible();
});

test("reduced motion keeps revealed content visible and all stages usable on mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "03Interview" }).click();
  await expect(page.getByText("Give every conversation context.", { exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "A home for every opening.", exact: true }).scrollIntoViewIfNeeded();
  expect(await page.locator(".motion-card").first().evaluate(el => getComputedStyle(el).opacity)).toBe("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const activeReveals = await page.locator("[data-reveal]").evaluateAll(elements => elements.flatMap(el => el.getAnimations()).filter(animation => animation.playState === "running").length);
  expect(activeReveals).toBe(0);
});

test("landing content is readable when JavaScript is unavailable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3000/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A home for every opening.", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create your workspace", exact: true })).toHaveAttribute("href", "/register");
  } finally { await context.close(); }
});
