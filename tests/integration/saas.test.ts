import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { assertAuditDatabase } from "../helpers/audit-db";
import { randomUUID, createHmac } from "crypto";
const state = vi.hoisted(() => ({ ctx: { userId: "", organizationId: "", role: "OWNER" }, canonical: {} as Record<string,unknown> }));
vi.mock("@/lib/require-auth", () => ({ requireOrg: async () => state.ctx, requireAuth: async () => state.ctx.userId }));
vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class extends Error { type = "CredentialsSignin"; } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({"x-forwarded-for":"127.0.0.1"}), cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/send-email", async original => ({ ...await original<typeof import("@/lib/send-email")>(), dispatchQueuedEmail: vi.fn(), sendEmail: vi.fn() }));
vi.mock("@/lib/ai-scoring-jobs", async original => ({ ...await original<typeof import("@/lib/ai-scoring-jobs")>(), dispatchAiScore: vi.fn() }));
vi.mock("@/lib/parse-resume", () => ({ extractResumeText: async () => "" }));
vi.mock("@/lib/billing-provider", async (original) => ({ ...await original<typeof import("@/lib/billing-provider")>(), stripeRequest: async () => state.canonical }));
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rate-limit";
import { checkApplicationCode, hashApplicationCode } from "@/lib/application-otp";
import { reserveAiScore } from "@/lib/entitlements";
import { updateJobStatusAction } from "@/actions/jobs-pool";
import { createJobAction } from "@/actions/create-job";
import { resetPasswordAction, registerAction } from "@/actions/auth";
import { submitApplicationAction, getApplicationStatusAction } from "@/actions/public-apply";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { inviteTeamMemberAction } from "@/actions/team";

describe("SaaS controls against isolated PostgreSQL", () => {
  const prefix = `audit-${randomUUID()}`;
  let userA: string, userB: string, orgA: string, orgB: string, jobB: string;
  beforeAll(async () => {
    assertAuditDatabase();
    process.env.AUTH_SECRET = "audit-only-secret-do-not-deploy";
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
    process.env.STRIPE_PRICE_STARTER_INR = "price_audit_starter";
    const a = await prisma.user.create({data:{email:`${prefix}-a@example.test`,password:"not-used",emailVerified:new Date()}});
    const b = await prisma.user.create({data:{email:`${prefix}-b@example.test`,password:"not-used",emailVerified:new Date()}});
    userA=a.id; userB=b.id;
    const oa=await prisma.organization.create({data:{name:prefix,ownerId:userA}});
    const ob=await prisma.organization.create({data:{name:prefix,ownerId:userB}});
    orgA=oa.id; orgB=ob.id;
    await prisma.membership.createMany({data:[{userId:userA,organizationId:orgA,role:"OWNER"},{userId:userB,organizationId:orgB,role:"OWNER"}]});
    const job=await prisma.job.create({data:{title:"Private B role",department:"Engineering",location:"Remote",type:"Full-time",description:"Test only",userId:userB,organizationId:orgB}}); jobB=job.id;
    state.ctx={userId:userA,organizationId:orgA,role:"OWNER"};
  });
  afterAll(async () => {
    await prisma.activityLog.deleteMany({where:{userId:{in:[userA,userB].filter(Boolean)}}});
    await prisma.emailOutbox.deleteMany({where:{recipient:{contains:prefix}}});
    await prisma.organization.deleteMany({where:{id:{in:[orgA,orgB].filter(Boolean)}}});
    await prisma.user.deleteMany({where:{id:{in:[userA,userB].filter(Boolean)}}});
    await prisma.applicationChallenge.deleteMany({where:{email:{startsWith:prefix}}});
    await prisma.verificationToken.deleteMany({where:{identifier:{contains:prefix}}});
    await prisma.billingEvent.deleteMany({where:{id:{startsWith:`evt_${prefix}`}}});
    await prisma.$disconnect();
  });
  it("enforces one shared allowance under parallel requests", async () => {
    const results=await Promise.all(Array.from({length:12},()=>allowRequest(prefix,3,600_000)));
    expect(results.filter(Boolean)).toHaveLength(3);
  });
  it("blocks unapproved pilot accounts before creating users or workspaces", async () => {
    const previous = process.env.PILOT_SIGNUP_EMAILS;
    process.env.PILOT_SIGNUP_EMAILS = ` ${prefix}-a@example.test `.toUpperCase();
    try {
      const email = `${prefix}-unapproved@example.test`;
      const result = await registerAction({name:"Pilot User",email,password:"PilotPassword1!"});
      expect(result.error).toContain("private pilot");
      expect(await prisma.user.findUnique({where:{email}})).toBeNull();
      const approved = await registerAction({name:"Pilot User",email:`${prefix}-a@example.test`,password:"PilotPassword1!"});
      expect(approved.error).toBe("Email already in use!");
    } finally {
      if(previous === undefined) delete process.env.PILOT_SIGNUP_EMAILS;
      else process.env.PILOT_SIGNUP_EMAILS = previous;
    }
  });
  it("fails closed for production registration without an allowlist", async () => {
    const previous = process.env.PILOT_SIGNUP_EMAILS;
    vi.stubEnv("NODE_ENV", "production");
    process.env.PILOT_SIGNUP_EMAILS = "";
    try {
      const email = `${prefix}-no-allowlist@example.test`;
      const result = await registerAction({ name: "Preview User", email, password: "PilotPassword1!" });
      expect(result.error).toContain("private pilot");
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      if (previous === undefined) delete process.env.PILOT_SIGNUP_EMAILS;
      else process.env.PILOT_SIGNUP_EMAILS = previous;
    }
  });
  it("locks an OTP after five guesses across every entry point", async () => {
    const email=`${prefix}-otp@example.test`;
    await prisma.applicationChallenge.create({data:{email,codeHash:hashApplicationCode(email,"123456"),expiresAt:new Date(Date.now()+600000)}});
    await Promise.all(Array.from({length:8},()=>checkApplicationCode(email,"999999")));
    expect((await prisma.applicationChallenge.findUniqueOrThrow({where:{email}})).attempts).toBe(5);
    expect(await checkApplicationCode(email,"123456",true)).toBe(false);
    expect((await getApplicationStatusAction(email,"123456")).error).toBeTruthy();
    const result=await submitApplicationAction({jobId:jobB,candidateName:"Test Candidate",candidateEmail:email,resumeUploadId:randomUUID(),otp:"123456",privacyAcknowledged:true});
    expect(result.error).toBeTruthy();
  });
  it("consumes a valid OTP only once under parallel calls", async () => {
    const email=`${prefix}-single@example.test`;
    await prisma.applicationChallenge.create({data:{email,codeHash:hashApplicationCode(email,"111111"),expiresAt:new Date(Date.now()+600000)}});
    const results=await Promise.all(Array.from({length:6},()=>checkApplicationCode(email,"111111",true)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("cannot mutate another tenant's job or use an unknown role", async () => {
    expect((await updateJobStatusAction(jobB,"CLOSED")).error).toBeTruthy();
    expect((await prisma.job.findUniqueOrThrow({where:{id:jobB}})).status).toBe("OPEN");
    state.ctx.role="UNKNOWN";
    expect((await createJobAction({title:"Blocked",department:"X",location:"Remote",type:"Full-time",description:"This is a test job"})).error).toBeTruthy();
    state.ctx.role="OWNER";
  });
  it("cannot overrun AI quotas under parallel attempts", async () => {
    await prisma.usageCounter.create({data:{organizationId:orgA,period:"trial",aiScores:99}});
    const results=await Promise.all(Array.from({length:8},()=>reserveAiScore(orgA)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await prisma.usageCounter.findUniqueOrThrow({where:{organizationId_period:{organizationId:orgA,period:"trial"}}})).aiScores).toBe(100);
  });
  it("resets a password atomically and revokes previous sessions", async () => {
    const email=`${prefix}-a@example.test`;
    const token=randomUUID();
    await prisma.verificationToken.create({data:{identifier:`reset-password:${email}`,token,expires:new Date(Date.now()+600000)}});
    const values={email,token,password:"NewSecurePassword9!"};
    const results=await Promise.all([resetPasswordAction(values),resetPasswordAction(values)]);
    expect(results.filter(r=>r.success)).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({where:{id:userA}})).sessionVersion).toBe(1);
  });
  it("enforces active job limits under simultaneous creation", async () => {
    await prisma.job.createMany({data:Array.from({length:19},(_,i)=>({title:`Quota job ${i}`,department:"Test",location:"Remote",type:"Full-time",description:"Test only",userId:userA,organizationId:orgA}))});
    const results=await Promise.all(Array.from({length:4},()=>createJobAction({title:"Quota edge",department:"Test",location:"Remote",type:"Full-time",description:"Concurrent quota test"})));
    expect(results.filter(r=>r.success)).toHaveLength(1);
    expect(await prisma.job.count({where:{organizationId:orgA,status:"OPEN"}})).toBe(20);
  });
  it("reserves pending recruiter invitation seats atomically", async () => {
    const results=await Promise.all(Array.from({length:7},(_,i)=>inviteTeamMemberAction({email:`${prefix}-invite-${i}@example.test`,role:"RECRUITER"})));
    expect(results.filter(r=>r.success)).toHaveLength(4);
    expect(await prisma.teamInvite.count({where:{organizationId:orgA}})).toBe(4);
  });
  it("stores an application, resume claim and privacy acknowledgement together", async () => {
    const email=`${prefix}-candidate@example.test`,otp="222222";
    await prisma.applicationChallenge.create({data:{email,codeHash:hashApplicationCode(email,otp),expiresAt:new Date(Date.now()+600000)}});
    const upload=await prisma.resumeUpload.create({data:{jobId:jobB,url:"https://res.cloudinary.com/audit/raw/authenticated/resume.pdf",publicId:randomUUID(),expiresAt:new Date(Date.now()+600000)}});
    const result=await submitApplicationAction({jobId:jobB,candidateName:"Test Candidate",candidateEmail:email,resumeUploadId:upload.id,otp,privacyAcknowledged:true});
    expect(result.success).toBeTruthy();
    const application=await prisma.jobApplication.findFirstOrThrow({where:{jobId:jobB,candidate:{email}},include:{candidate:true}});
    expect(application.candidate.organizationId).toBe(orgB);
    expect(application.resumeUrl).toBe(upload.url);
    expect(application.privacyNoticeVersion).toBe("2026-09-16");
    expect(application.privacyAcknowledgedAt).not.toBeNull();
    expect((await prisma.resumeUpload.findUniqueOrThrow({where:{id:upload.id}})).consumedAt).not.toBeNull();
    expect(await prisma.applicationChallenge.findUnique({where:{email}})).toBeNull();
  });
  it("does not activate a plan from a forged webhook", async () => {
    const result=await webhook(new Request("http://localhost/api/billing/webhook",{method:"POST",body:'{}',headers:{"stripe-signature":"v1=bad"}}));
    expect(result.status).toBe(400);
    expect(await prisma.subscription.findUnique({where:{organizationId:orgA}})).toBeNull();
  });
  it("handles duplicate signed events and uses provider current state", async () => {
    const subId=`sub_${prefix}`;
    state.canonical={id:subId,customer:`cus_${prefix}`,status:"active",metadata:{organizationId:orgA},items:{data:[{current_period_end:Math.floor(Date.now()/1000)+86400,price:{id:"price_audit_starter",currency:"inr"}}]}};
    const event={id:`evt_${prefix}_1`,type:"customer.subscription.updated",data:{object:{id:subId,metadata:{organizationId:orgA},status:"canceled"}}};
    function request(e:typeof event) { const body=JSON.stringify(e),t=String(Math.floor(Date.now()/1000));return new Request("http://localhost/api/billing/webhook",{method:"POST",body,headers:{"stripe-signature":`t=${t},v1=${createHmac("sha256","whsec_mock").update(`${t}.${body}`).digest("hex")}`}}); }
    const results=await Promise.all([webhook(request(event)),webhook(request(event))]);
    expect(results.map(r=>r.status)).toEqual([200,200]);
    expect((await prisma.subscription.findUniqueOrThrow({where:{organizationId:orgA}})).status).toBe("active");
    expect(await prisma.billingEvent.count({where:{id:event.id}})).toBe(1);
    state.canonical={...state.canonical,status:"past_due"};
    expect((await webhook(request({...event,id:`evt_${prefix}_2`}))).status).toBe(200);
    await expect(reserveAiScore(orgA)).rejects.toThrow(/subscription has ended/);
  });
});
