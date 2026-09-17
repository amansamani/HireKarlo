import { test, expect } from "@playwright/test";

test("public SaaS pages are accessible without an account", async ({ page }) => {
  for (const [path, heading] of [["/pricing", "One workspace for your hiring team."], ["/privacy", "Privacy notice"], ["/terms", "Service terms"], ["/cookies", "Cookie Policy"]]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  }
});

test("pricing is readable on mobile and checkout stays behind authentication", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/pricing");
  await page.getByRole("button", { name: "Reject analytics", exact: true }).click();
  await expect(page.getByRole("heading", {name:"Starter",exact:true})).toBeVisible();
  await expect(page.getByText("₹1,499",{exact:false})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:"audit-artifacts/pricing-mobile.png",fullPage:true});
  await page.getByRole("link",{name:"Start your trial"}).first().click();
  await expect(page).toHaveURL(/\/register$/);
});

test("protected workspace routes require sign-in", async ({ page }) => {
  await page.goto("/dashboard/billing");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/rate-interview?token=invalid");
  await expect(page).toHaveURL(/\/rate-interview\?token=invalid$/);
});
