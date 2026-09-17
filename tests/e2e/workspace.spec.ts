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
    await page.getByRole("button",{name:"Sign In",exact:true}).click(); await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  }
  test("owner session survives refresh and can add a client and open a pipeline",async({page})=>{
    await login(page,process.env.E2E_OWNER_EMAIL!); await page.reload(); await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/dashboard/clients"); await page.getByLabel("Company name").fill("Browser QA Client"); await page.getByLabel("Contact email").fill(`${process.env.E2E_PREFIX}-client@example.test`);
    await page.getByRole("button",{name:"Add client",exact:true}).click(); await expect(page.getByRole("heading",{name:"Browser QA Client"})).toBeVisible();
    await page.screenshot({path:"audit-artifacts/workspace-desktop.png",fullPage:true});
    await page.goto(`/dashboard/jobs/${process.env.E2E_JOB_ID}`); await expect(page.getByText("Browser Audit Candidate",{exact:true})).toBeVisible();
    await page.goto("/dashboard/billing"); await expect(page.getByRole("heading",{name:"Billing & usage",exact:true})).toBeVisible();
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
});
test("core readiness endpoint is non-cacheable and has security headers",async({request})=>{
  const response=await request.get("/api/health"); expect(response.status()).toBe(200);expect(await response.json()).toEqual({status:"ok"});
  expect(response.headers()["cache-control"]).toContain("no-store");expect(response.headers()["x-content-type-options"]).toBe("nosniff");expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect((await request.get("/api/cron/ai-scoring")).status()).toBe(401);expect((await request.get("/api/cron/email-outbox")).status()).toBe(401);
});
test("pricing remains usable at tablet width",async({page})=>{
  await page.setViewportSize({width:768,height:1024});await page.goto("/pricing");await expect(page.getByRole("heading",{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:"audit-artifacts/pricing-tablet.png",fullPage:true});
});
