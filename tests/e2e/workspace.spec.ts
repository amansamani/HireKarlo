import { test, expect, type Page } from "@playwright/test";
test.describe("authenticated workspace journey",()=>{
  test.skip(process.env.E2E_AUDIT_DB!=="true","Requires explicitly enabled isolated local PostgreSQL fixtures");
  async function login(page:Page,email:string){
    await page.goto("/login");
    // Complete first-visit consent before opening workspace controls.
    const rejectAnalytics = page.getByRole("button", { name: "Reject analytics", exact: true });
    await rejectAnalytics.click();
    await expect(rejectAnalytics).toHaveCount(0);
    await page.getByPlaceholder("recruiter@company.com").fill(email); await page.getByPlaceholder("••••••••").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button",{name:"Sign In",exact:true}).click(); await expect(page,"Sign-in should reach the dashboard (a \"Too many login attempts\" toast means the per-email login rate limit was hit)").toHaveURL(/\/dashboard(?:\?.*)?$/);
  }
  test("owner session survives refresh and can add a client and open a pipeline",async({page})=>{
    await login(page,process.env.E2E_OWNER_EMAIL!); await page.reload(); await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/dashboard/clients"); await page.getByLabel("Company name").fill("Browser QA Client"); await page.getByLabel("Contact email").fill(`${process.env.E2E_PREFIX}-client@example.test`);
    await page.getByRole("button",{name:"Add client",exact:true}).click(); await expect(page.getByRole("heading",{name:"Browser QA Client"})).toBeVisible();
    await page.screenshot({path:"audit-artifacts/workspace-desktop.png",fullPage:true});
    await page.goto(`/dashboard/jobs/${process.env.E2E_JOB_ID}`); await expect(page.getByText("Browser Audit Candidate",{exact:true})).toBeVisible();
    await page.goto("/dashboard/billing"); await expect(page.getByRole("heading",{name:"Billing & usage",exact:true})).toBeVisible();
    await expect(page.getByText("Test payments only.", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment history", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose Starter", exact: true })).toBeDisabled();
    await page.screenshot({ path: "audit-artifacts/razorpay-billing.png", fullPage: true });
    await page.goto("/dashboard/interviews");await expect(page.getByLabel("Candidate experience: 4 out of 5")).toBeVisible();
    await page.getByRole("button",{name:"Open profile menu",exact:true}).click();await page.getByRole("button",{name:"Sign out",exact:true}).click();await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard/clients");await expect(page).toHaveURL(/\/login$/);
  });
  test("a verified interviewer cannot access hiring controls or export private records",async({page})=>{
    await login(page,process.env.E2E_INTERVIEWER_EMAIL!); await page.goto("/dashboard/clients"); await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/dashboard/jobs/${process.env.E2E_JOB_ID}`); await expect(page.getByText("Browser Audit Candidate",{exact:true})).toHaveCount(0);
    const response=await page.request.get(`/api/application-resumes/${process.env.E2E_APPLICATION_ID}`);expect([401,403,404]).toContain(response.status());
    await page.goto("/dashboard/interviews");await expect(page.getByText("Browser Assigned Round",{exact:true})).toBeVisible();await expect(page.getByText("Hidden Unassigned Candidate",{exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:"Cancel interview",exact:true})).toHaveCount(0);
    await page.getByRole("button",{name:"Submit scorecard",exact:true}).click();
    await page.getByPlaceholder("Structured feedback notes…").fill("Synthetic browser feedback");
    await page.getByRole("button",{name:"Save scorecard",exact:true}).click();
    await expect(page.getByText("Result: Passed",{exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button",{name:"Reject analytics",exact:true})).toHaveCount(0);
    await expect(page.getByText("Synthetic browser feedback",{exact:true})).toBeVisible();
  });
  test("owner cannot inspect an application pipeline without a workspace membership",async({page})=>{
    await login(page,process.env.E2E_OWNER_EMAIL!); await page.goto(`/dashboard/jobs/${process.env.E2E_OTHER_JOB_ID}`);
    await expect(page.getByText("Private Other Role",{exact:true})).toHaveCount(0); await expect(page.getByText("Pipeline not found",{exact:true})).toBeVisible();
  });
  test("owner can edit an opening, recover a stale workspace and inspect audit history", async ({ page, context }) => {
    await login(page, process.env.E2E_OWNER_EMAIL!);
    await context.addCookies([{ name: "hirekarlo-organization", value: "deleted-workspace", url: "http://localhost:3000", httpOnly: true }]);
    await page.goto(`/dashboard/jobs/${process.env.E2E_JOB_ID}/edit`);
    await page.getByLabel("Salary range", { exact: true }).fill("100000–150000");
    await page.getByRole("button", { name: "Save opening", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/jobs/${process.env.E2E_JOB_ID}$`));
    await page.getByRole("button", { name: "Hired", exact: true }).click();
    await expect(page.getByRole("button", { name: "Hired", exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Browser Audit Candidate", { exact: true })).toBeVisible();
    await page.goto(`/dashboard/jobs/${process.env.E2E_JOB_ID}/edit`);
    await expect(page.getByLabel("Salary range", { exact: true })).toHaveValue("100000–150000");
    await page.goto("/dashboard/candidates");
    await page.getByRole("link", { name: "Browser Audit Candidate", exact: true }).click();
    // Candidate profiles are read-only by design (the data is submitted by the candidate):
    // hiring staff can open the record but must not get any edit controls.
    await expect(page.getByRole("heading", { name: "Browser Audit Candidate", exact: true })).toBeVisible();
    await expect(page.getByText("View only", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Recruiter notes", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save profile", exact: true })).toHaveCount(0);
    await page.goto("/dashboard/audit");
    await expect(page.getByText("JOB_UPDATED", { exact: true })).toBeVisible();
    await page.goto("/dashboard/team");
    await expect(page.getByText("Google Calendar", { exact: true })).toBeVisible();
    const inviteEmail = `${process.env.E2E_PREFIX}-revoke@example.test`;
    await page.getByPlaceholder("teammate@company.com").fill(inviteEmail);
    await page.getByRole("button", { name: "Send Invite", exact: true }).click();
    const revoke = page.getByRole("button", { name: `Revoke invitation for ${inviteEmail}`, exact: true });
    await expect(revoke).toBeVisible();
    await revoke.click();
    await expect(revoke).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(inviteEmail, { exact: true })).toHaveCount(0);
  });
  test("interviewers cannot open editors or administrative audit history", async ({ page }) => {
    await login(page, process.env.E2E_INTERVIEWER_EMAIL!);
    await page.goto(`/dashboard/jobs/${process.env.E2E_JOB_ID}/edit`);
    await expect(page.getByRole("button", { name: "Save opening", exact: true })).toHaveCount(0);
    await page.goto("/dashboard/audit");
    await expect(page.getByRole("heading", { name: "Workspace audit history", exact: true })).toHaveCount(0);
  });
});
test("core readiness endpoint is non-cacheable and has security headers",async({request})=>{
  const response=await request.get("/api/health"); expect(response.status()).toBe(200);expect(await response.json()).toEqual({status:"ok"});
  expect(response.headers()["cache-control"]).toContain("no-store");expect(response.headers()["x-content-type-options"]).toBe("nosniff");expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect((await request.get("/api/cron/ai-scoring")).status()).toBe(401);expect((await request.get("/api/cron/email-outbox")).status()).toBe(401);
});
test("pricing remains usable at tablet width",async({page})=>{
  await page.setViewportSize({width:768,height:1024});await page.goto("/pricing");await expect(page.getByRole("heading",{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:"audit-artifacts/pricing-tablet.png",fullPage:true});
});
