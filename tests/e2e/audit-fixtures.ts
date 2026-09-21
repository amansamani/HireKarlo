import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { assertAuditDatabase } from "../helpers/audit-db";

export default async function setup() {
  if (process.env.E2E_AUDIT_DB !== "true") return;
  assertAuditDatabase();
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1}),db=new PrismaClient({adapter:new PrismaPg(pool)});
  const prefix=`browser-${randomUUID()}`, password=`Audit9!${randomUUID()}`;
  try {
    const hash=await bcrypt.hash(password,10);
    const owner=await db.user.create({data:{email:`${prefix}-owner@example.test`,name:"Browser Owner",password:hash,emailVerified:new Date()}});
    const interviewer=await db.user.create({data:{email:`${prefix}-interviewer@example.test`,name:"Browser Interviewer",password:hash,emailVerified:new Date()}});
    // Sign-in is throttled to 10 attempts per email per 10 minutes (lib/rate-limit.ts). One shared owner
    // used to consume the whole budget on the first pass, so any Playwright retry was locked out.
    // Give each spec file that signs in as an owner its own account, all in the same workspace.
    const billingOwner=await db.user.create({data:{email:`${prefix}-billing-owner@example.test`,name:"Browser Billing Owner",password:hash,emailVerified:new Date()}});
    const uiOwner=await db.user.create({data:{email:`${prefix}-ui-owner@example.test`,name:"Browser UI Owner",password:hash,emailVerified:new Date()}});
    const org=await db.organization.create({data:{name:"Browser Audit Workspace",ownerId:owner.id}});
    await db.membership.createMany({data:[{organizationId:org.id,userId:owner.id,role:"OWNER"},{organizationId:org.id,userId:billingOwner.id,role:"OWNER"},{organizationId:org.id,userId:uiOwner.id,role:"OWNER"},{organizationId:org.id,userId:interviewer.id,role:"INTERVIEWER"}]});
    const other=await db.organization.create({data:{name:"Other Audit Workspace",ownerId:owner.id}});
    const intentId = randomUUID();
    await db.razorpayAgreement.create({ data: { id: intentId, organizationId: org.id, plan: "STARTER", providerPlanId: "plan_browser", keyId: "rzp_test_browser", amount: 149900, providerSubscriptionId: "sub_browser", creationAttemptedAt: new Date(), status: "created" } });
    await db.billingCheckout.create({ data: { organizationId: org.id, provider: "razorpay", providerSessionId: "sub_browser", idempotencyKey: intentId, plan: "STARTER", currency: "INR", url: "https://rzp.io/i/browser", expiresAt: new Date(Date.now() + 86400_000) } });
    const job=await db.job.create({data:{title:"Browser Audit Role",department:"Engineering",location:"Remote",type:"Full-time",description:"Browser test fixture",userId:owner.id,organizationId:org.id}});
    const otherJob=await db.job.create({data:{title:"Private Other Role",department:"Engineering",location:"Remote",type:"Full-time",description:"Do not disclose",userId:owner.id,organizationId:other.id}});
    const candidate=await db.candidate.create({data:{fullName:"Browser Audit Candidate",email:`${prefix}-candidate@example.test`,experience:1,skills:[],organizationId:org.id,recruiterId:owner.id}});
    const app=await db.jobApplication.create({data:{candidateId:candidate.id,jobId:job.id,stage:"OFFER"}});
    await db.interview.create({data:{applicationId:app.id,round:"Browser Assigned Round",interviewerId:interviewer.id,interviewer:"Browser Interviewer",scheduledAt:new Date(Date.now()+86400000),candidateExperienceRating:4,interviewerRating:2}});
    const hidden=await db.candidate.create({data:{fullName:"Hidden Unassigned Candidate",email:`${prefix}-hidden@example.test`,experience:1,skills:[],organizationId:org.id,recruiterId:owner.id}});
    const hiddenApp=await db.jobApplication.create({data:{candidateId:hidden.id,jobId:job.id}});
    await db.interview.create({data:{applicationId:hiddenApp.id,round:"Hidden Owner Round",interviewerId:owner.id,interviewer:"Browser Owner",scheduledAt:new Date(Date.now()+2*86400000)}});
    // Failed scorecards waiting on a recruiter decision (interview-outcome.spec.ts). The first two are not
    // assigned to the interviewer, so the interviewer journey still has exactly one scorecard left to submit.
    // Own job: these cards get rejected/overridden by interview-outcome.spec.ts, which runs in parallel with
    // workspace.spec.ts and must not change the board that spec drives.
    const decisionJob=await db.job.create({data:{title:"Decision Flow Role",department:"Engineering",location:"Remote",type:"Full-time",description:"Interview outcome fixture",userId:owner.id,organizationId:org.id}});
    const failedRound=async(name:string,slug:string,interviewerId:string|null,interviewerName:string)=>{
      const cand=await db.candidate.create({data:{fullName:name,email:`${prefix}-${slug}@example.test`,experience:1,skills:[],organizationId:org.id,recruiterId:owner.id}});
      const application=await db.jobApplication.create({data:{candidateId:cand.id,jobId:decisionJob.id,stage:"Interview"}});
      await db.interview.create({data:{applicationId:application.id,round:`Decision round ${slug}`,interviewer:interviewerName,interviewerId,scheduledById:owner.id,scheduledAt:new Date(Date.now()-3600_000),result:"FAILED",rating:2,feedback:`Fixture feedback ${slug}`,scorecardSubmittedAt:new Date(),reviewStatus:"PENDING_REVIEW",reviewAssigneeId:owner.id}});
    };
    await failedRound("Confirm Flow Candidate","confirm-flow",null,"External Panelist");
    await failedRound("Override Flow Candidate","override-flow",null,"External Panelist");
    await failedRound("Awaiting Decision Candidate","awaiting-decision",interviewer.id,"Browser Interviewer");
    Object.assign(process.env,{E2E_PREFIX:prefix,E2E_OWNER_EMAIL:owner.email,E2E_BILLING_OWNER_EMAIL:billingOwner.email,E2E_UI_OWNER_EMAIL:uiOwner.email,E2E_INTERVIEWER_EMAIL:interviewer.email,E2E_PASSWORD:password,E2E_JOB_ID:job.id,E2E_DECISION_JOB_ID:decisionJob.id,E2E_OTHER_JOB_ID:otherJob.id,E2E_APPLICATION_ID:app.id});
  } finally { await db.$disconnect(); await pool.end(); }
}
