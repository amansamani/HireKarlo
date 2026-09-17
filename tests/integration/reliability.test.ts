import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { assertAuditDatabase } from "../helpers/audit-db";
const mail=vi.hoisted(()=>({send:vi.fn(async()=>({messageId:"mock-only"}))}));
vi.mock("nodemailer",()=>({default:{createTransport:()=>({sendMail:mail.send})}}));
const state=vi.hoisted(()=>({ctx:{userId:"",organizationId:"",role:"OWNER"},text:"Actual extracted resume text",score:{matchScore:83,summary:"Relevant experience"} as {matchScore:number;summary:string}|null,upload:vi.fn((options:Record<string,unknown>,callback:(error:null,result:{secure_url:string;public_id:string})=>void)=>({end:()=>callback(null,{secure_url:`https://res.cloudinary.com/audit/raw/authenticated/${options.public_id}`,public_id:String(options.public_id)})}))}));
vi.mock("@/lib/require-auth",()=>({requireOrg:async()=>state.ctx,requireAuth:async()=>state.ctx.userId}));
vi.mock("next/headers",()=>({headers:async()=>new Headers({"x-forwarded-for":"127.0.0.1"}),cookies:async()=>({get:()=>undefined,set:vi.fn()})}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/auth",()=>({signIn:vi.fn()}));
vi.mock("next-auth",()=>({AuthError:class extends Error{type="CredentialsSignin";}}));
vi.mock("@/lib/send-email",async original=>({...await original<typeof import("@/lib/send-email")>(),dispatchQueuedEmail:vi.fn()}));
vi.mock("@/lib/ai-scoring-jobs",async original=>({...await original<typeof import("@/lib/ai-scoring-jobs")>(),dispatchAiScore:vi.fn()}));
vi.mock("@/lib/parse-resume",()=>({extractResumeText:async()=>state.text}));
vi.mock("@/lib/score-resume",()=>({scoreResumeAgainstJob:vi.fn(async()=>state.score)}));
vi.mock("@/lib/google-calendar",()=>({createMeetEvent:vi.fn(),deleteMeetEvent:vi.fn()}));
vi.mock("@/lib/cloudinary",()=>({cloudinary:{uploader:{upload_stream:state.upload,destroy:vi.fn()}}}));
import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/credentials";
import { registerAction } from "@/actions/auth";
import { GET as verifyEmail } from "@/app/api/auth/verify-email/route";
import { scheduleInterviewAction, cancelInterviewAction, submitInterviewExperienceRatingAction } from "@/actions/interview";
import { updateApplicationStatusAction } from "@/actions/application";
import { processAiScoringJob, queueAiScore } from "@/lib/ai-scoring-jobs";
import { scoreResumeAgainstJob } from "@/lib/score-resume";
import { enqueueEmail, deliverEmail } from "@/lib/send-email";
import { checkApplicationCode, hashApplicationCode } from "@/lib/application-otp";
import { POST as uploadResume } from "@/app/api/upload/route";
import { exportCandidatesCsvAction } from "@/actions/candidates-pool";
import { inviteTeamMemberAction, acceptInviteAction, removeMemberAction } from "@/actions/team";
import { getAllInterviewsAction } from "@/actions/interviews-pool";

describe("authentication and workflow reliability in isolated PostgreSQL",()=>{
  const prefix=`reliability-${randomUUID()}`, password="StrongAuditPassword9!";
  let userId:string,orgId:string,jobId:string,appId:string;
  beforeAll(async()=>{
    assertAuditDatabase(); process.env.AUTH_SECRET="audit-secret-with-at-least-32-characters"; process.env.GEMINI_API_KEY="mock-only"; process.env.EMAIL_USER="mock@example.test";process.env.EMAIL_PASS="mock-only";delete process.env.PILOT_SIGNUP_EMAILS;
    const user=await prisma.user.create({data:{email:`${prefix}@example.test`,password:await bcrypt.hash(password,10),emailVerified:new Date()}}); userId=user.id;
    const org=await prisma.organization.create({data:{name:prefix,ownerId:userId}});orgId=org.id;
    await prisma.membership.create({data:{organizationId:orgId,userId,role:"OWNER"}});
    const job=await prisma.job.create({data:{title:"Reliability role",department:"Engineering",location:"Remote",type:"Full-time",description:"A database fixture",organizationId:orgId,userId,interviewRounds:["Technical"]}});jobId=job.id;
    const candidate=await prisma.candidate.create({data:{fullName:"Audit Candidate",email:`${prefix}-candidate@example.test`,experience:1,skills:[],organizationId:orgId,recruiterId:userId}});
    const app=await prisma.jobApplication.create({data:{candidateId:candidate.id,jobId,resumeUrl:"https://res.cloudinary.com/audit/raw/authenticated/test.pdf"}});appId=app.id;
    state.ctx={userId,organizationId:orgId,role:"OWNER"};
  });
  afterAll(async()=>{
    const users=await prisma.user.findMany({where:{email:{startsWith:prefix}},select:{id:true}}); const ids=users.map(u=>u.id);
    await prisma.activityLog.deleteMany({where:{userId:{in:ids}}});
    await prisma.organization.deleteMany({where:{ownerId:{in:ids}}});
    await prisma.user.deleteMany({where:{id:{in:ids}}});
    await prisma.emailOutbox.deleteMany({where:{recipient:{contains:prefix}}});
    await prisma.verificationToken.deleteMany({where:{identifier:{contains:prefix}}});
    await prisma.applicationChallenge.deleteMany({where:{email:{startsWith:prefix}}});
    await prisma.$disconnect();
  });
  it("authorizes only verified accounts with the correct password",async()=>{
    expect((await authorizeCredentials({email:` ${prefix}@EXAMPLE.TEST `,password}))?.id).toBe(userId);
    expect(await authorizeCredentials({email:`${prefix}@example.test`,password:"WrongPassword9!"})).toBeNull();
    await prisma.user.update({where:{id:userId},data:{emailVerified:null}});
    expect(await authorizeCredentials({email:`${prefix}@example.test`,password})).toBeNull();
    await prisma.user.update({where:{id:userId},data:{emailVerified:new Date()}});
  });
  it("rejects bcrypt inputs above 72 UTF-8 bytes before creating an account",async()=>{
    const email=`${prefix}-bytes@example.test`; const result=await registerAction({name:"Audit Name",email,password:`A1!${"é".repeat(35)}`});
    expect(result.error).toBeTruthy(); expect(await prisma.user.findUnique({where:{email}})).toBeNull();
  });
  it("enforces database role, duration and score constraints beneath action validation",async()=>{
    await expect(prisma.membership.updateMany({where:{organizationId:orgId,userId},data:{role:"SUPERUSER"}})).rejects.toThrow();
    await expect(prisma.interview.create({data:{applicationId:appId,round:"Invalid",interviewer:"Test",scheduledAt:new Date(),durationMinutes:1}})).rejects.toThrow();
    await expect(prisma.jobApplication.update({where:{id:appId},data:{matchScore:101}})).rejects.toThrow();
    expect((await prisma.membership.findFirstOrThrow({where:{organizationId:orgId,userId}})).role).toBe("OWNER");
  });
  it("accepts invitations only for the intended account and removes membership without deleting that account",async()=>{
    const email=`${prefix}-teammate@example.test`;expect((await inviteTeamMemberAction({email,role:"RECRUITER"})).success).toBeTruthy();const invite=await prisma.teamInvite.findUniqueOrThrow({where:{organizationId_email:{organizationId:orgId,email}}});
    expect((await acceptInviteAction(invite.token)).error).toBeTruthy();const user=await prisma.user.create({data:{email,password:"unused",emailVerified:new Date()}});
    state.ctx.userId=user.id;expect((await acceptInviteAction(invite.token)).success).toBeTruthy();expect((await acceptInviteAction(invite.token)).error).toBeTruthy();
    state.ctx.userId=userId;const member=await prisma.membership.findFirstOrThrow({where:{userId:user.id,organizationId:orgId}});expect((await removeMemberAction(member.id)).success).toBeTruthy();expect(await prisma.membership.findUnique({where:{id:member.id}})).toBeNull();expect(await prisma.user.findUnique({where:{id:user.id}})).not.toBeNull();
  });
  it("persists signup, verification token and delivery intent atomically, then verifies once",async()=>{
    const email=`${prefix}-signup@example.test`; expect((await registerAction({name:"Audit Signup",email,password})).success).toBeTruthy();
    const user=await prisma.user.findUniqueOrThrow({where:{email}});expect(user.emailVerified).toBeNull(); expect(await prisma.organization.count({where:{ownerId:user.id}})).toBe(1);
    expect(await prisma.emailOutbox.count({where:{recipient:email}})).toBe(1);
    const token=await prisma.verificationToken.findFirstOrThrow({where:{identifier:email}});
    const request=()=>new NextRequest(`http://localhost/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${token.token}`);
    const results=await Promise.all([verifyEmail(request()),verifyEmail(request())]);expect(results.filter(r=>r.headers.get("location")?.includes("verified=1"))).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({where:{email}})).emailVerified).not.toBeNull(); expect(await prisma.verificationToken.findUnique({where:{token:token.token}})).toBeNull();
  });
  it("rejects expired verification links",async()=>{
    const email=`${prefix}-expired@example.test`,token=randomUUID();await prisma.user.create({data:{email,password:"unused"}}); await prisma.verificationToken.create({data:{identifier:email,token,expires:new Date(Date.now()-1000)}});
    const result=await verifyEmail(new NextRequest(`http://localhost/api/auth/verify-email?email=${email}&token=${token}`));expect(result.headers.get("location")).toContain("invalid_token");expect((await prisma.user.findUniqueOrThrow({where:{email}})).emailVerified).toBeNull();
  });
  const slot=()=>({applicationId:appId,jobId,round:"Technical",targetStage:"Technical",interviewer:"Audit Interviewer",interviewerId:userId,scheduledAt:new Date(Date.now()+86400000).toISOString(),durationMinutes:60,timezone:"UTC"});
  it("requires a live email challenge before any storage upload and keeps valid checks usable",async()=>{
    const email=`${prefix}-upload@example.test`,otp="123456"; await prisma.applicationChallenge.create({data:{email,codeHash:hashApplicationCode(email,otp),expiresAt:new Date(Date.now()+600000),attempts:4}});
    function request(code:string){const form=new FormData();form.set("jobId",jobId);form.set("email",email);form.set("otp",code);form.set("file",new File(["%PDF-1.7 synthetic"],"resume.pdf",{type:"application/pdf"}));return new NextRequest("http://localhost/api/upload",{method:"POST",body:form,headers:{"x-forwarded-for":"127.0.0.1"}});}
    const denied=await uploadResume(request("abcdef"));expect(denied.status).toBe(403);expect(state.upload).not.toHaveBeenCalled();
    const accepted=await uploadResume(request(otp));expect(accepted.status).toBe(200);expect((await accepted.json()).uploadId).toBeTruthy();expect(state.upload).toHaveBeenCalledTimes(1);
    expect((await prisma.applicationChallenge.findUniqueOrThrow({where:{email}})).attempts).toBe(4);expect(await checkApplicationCode(email,otp)).toBe(true);
    await prisma.applicationChallenge.delete({where:{email}});
  });
  it("escapes spreadsheet formulas and excludes direct storage URLs from CSV",async()=>{
    const app=await prisma.jobApplication.findUniqueOrThrow({where:{id:appId}});await prisma.candidate.update({where:{id:app.candidateId},data:{fullName:'=HYPERLINK("https://example.test")',resumeUrl:"https://res.cloudinary.com/audit/raw/authenticated/private.pdf"}});
    const result=await exportCandidatesCsvAction();expect(result.csv).toContain("'=");expect(result.csv).toContain('""https://example.test""');expect(result.csv).not.toContain("authenticated/private.pdf");
    state.ctx.role="INTERVIEWER";expect((await exportCandidatesCsvAction()).error).toBe("Unauthorized");state.ctx.role="OWNER";
  });
  it("reserves only one overlapping interview under parallel requests",async()=>{
    const values=slot();const results=await Promise.all([scheduleInterviewAction(values),scheduleInterviewAction(values)]);expect(results.filter(r=>r.success)).toHaveLength(1);expect(results.filter(r=>r.error?.includes("overlapping"))).toHaveLength(1);
    expect(await prisma.interview.count({where:{applicationId:appId}})).toBe(1);expect(await prisma.emailOutbox.count({where:{dedupeKey:{startsWith:"interview-scheduled:"},recipient:`${prefix}-candidate@example.test`}})).toBe(1);
    state.ctx.role="INTERVIEWER";expect((await getAllInterviewsAction()).interviews).toHaveLength(1);state.ctx.userId="unassigned-user";expect((await getAllInterviewsAction()).interviews).toHaveLength(0);state.ctx.userId=userId;state.ctx.role="UNKNOWN";expect((await getAllInterviewsAction()).error).toBe("Unauthorized");state.ctx.role="OWNER";
  });
  it("rejects mismatched jobs, unknown timezones and unauthorized actors",async()=>{
    expect((await scheduleInterviewAction({...slot(),jobId:"another-job"})).error).toBeTruthy(); expect((await scheduleInterviewAction({...slot(),timezone:"Moon/Sea"})).error).toContain("timezone");
    state.ctx.role="INTERVIEWER"; expect((await scheduleInterviewAction(slot())).error).toBeTruthy(); state.ctx.role="OWNER";
  });
  it("uses feedback links once and keeps candidate experience separate from recruiter ratings",async()=>{
    const interview=await prisma.interview.findFirstOrThrow({where:{applicationId:appId}}),token=randomUUID();await prisma.interview.update({where:{id:interview.id},data:{interviewerRating:2}});
    await prisma.verificationToken.create({data:{identifier:`interview-feedback:${interview.id}`,token,expires:new Date(Date.now()+600000)}});
    expect((await submitInterviewExperienceRatingAction(token,1.5)).error).toBeTruthy(); const results=await Promise.all([submitInterviewExperienceRatingAction(token,5),submitInterviewExperienceRatingAction(token,4)]);expect(results.filter(r=>r.success)).toHaveLength(1);
    const saved=await prisma.interview.findUniqueOrThrow({where:{id:interview.id}});expect([4,5]).toContain(saved.candidateExperienceRating);expect(saved.interviewerRating).toBe(2);
  });
  it("cancellation preserves terminal stages and queues its notification",async()=>{
    expect((await updateApplicationStatusAction(appId,"HIRED",jobId)).success).toBeTruthy(); const interview=await prisma.interview.findFirstOrThrow({where:{applicationId:appId}});
    expect((await cancelInterviewAction(interview.id)).success).toBeTruthy();expect((await prisma.jobApplication.findUniqueOrThrow({where:{id:appId}})).stage).toBe("HIRED");expect(await prisma.interview.findUnique({where:{id:interview.id}})).toBeNull();
    expect((await prisma.emailOutbox.findUniqueOrThrow({where:{dedupeKey:`interview-scheduled:${interview.id}`}})).failedAt).not.toBeNull();
    expect((await scheduleInterviewAction(slot())).error).toContain("hired or rejected");expect(await prisma.interview.count({where:{applicationId:appId}})).toBe(0);
  });
  it("rolls back both business changes and delivery intent on a transaction failure",async()=>{
    const before=await prisma.emailOutbox.count({where:{recipient:`${prefix}-rollback@example.test`}});
    await expect(prisma.$transaction(async tx=>{await tx.jobApplication.update({where:{id:appId},data:{stage:"REJECTED"}});await enqueueEmail(tx,`${prefix}-rollback@example.test`,"Audit","Audit");throw new Error("deliberate rollback");})).rejects.toThrow("deliberate rollback");
    expect((await prisma.jobApplication.findUniqueOrThrow({where:{id:appId}})).stage).toBe("HIRED");expect(await prisma.emailOutbox.count({where:{recipient:`${prefix}-rollback@example.test`}})).toBe(before);
  });
  it("keeps shared hiring records when a creator deletion is attempted",async()=>{await expect(prisma.user.delete({where:{id:userId}})).rejects.toThrow(); expect(await prisma.job.findUnique({where:{id:jobId}})).not.toBeNull();});
  it("leases email once under concurrent delivery and fences stale acknowledgements",async()=>{
    const id=await enqueueEmail(prisma,`${prefix}-mail@example.test`,"Mock delivery","Synthetic content");mail.send.mockClear();
    const results=await Promise.all([deliverEmail(id),deliverEmail(id)]);expect(results.filter(Boolean)).toHaveLength(1);expect(mail.send).toHaveBeenCalledTimes(1);expect((await prisma.emailOutbox.findUniqueOrThrow({where:{id}})).sentAt).not.toBeNull();
    const staleId=await enqueueEmail(prisma,`${prefix}-stale@example.test`,"Mock stale delivery","Synthetic content");
    mail.send.mockImplementationOnce(async()=>{await prisma.emailOutbox.update({where:{id:staleId},data:{leaseToken:"new-worker",leaseUntil:new Date(Date.now()+600000)}});return {messageId:"mock-only"};});
    expect(await deliverEmail(staleId)).toBe(false);const stale=await prisma.emailOutbox.findUniqueOrThrow({where:{id:staleId}});expect(stale.sentAt).toBeNull();expect(stale.leaseToken).toBe("new-worker");
  });
  it("backs off failed SMTP deliveries and retains a dead letter after eight attempts",async()=>{
    const id=await enqueueEmail(prisma,`${prefix}-failure@example.test`,"Mock failing delivery","Synthetic content");mail.send.mockRejectedValue(new Error("mock provider unavailable"));
    for(let i=0;i<8;i++){await prisma.emailOutbox.update({where:{id},data:{availableAt:new Date(0)}});expect(await deliverEmail(id)).toBe(false);}
    const result=await prisma.emailOutbox.findUniqueOrThrow({where:{id}});expect(result.attempts).toBe(8);expect(result.failedAt).not.toBeNull();expect(result.sentAt).toBeNull();expect(await deliverEmail(id)).toBe(false);mail.send.mockResolvedValue({messageId:"mock-only"});
  });
  it("claims an AI job once, consumes one allowance and writes a validated score",async()=>{
    await queueAiScore(prisma,appId);vi.mocked(scoreResumeAgainstJob).mockClear(); const results=await Promise.all([processAiScoringJob(appId),processAiScoringJob(appId)]);
    expect(results.filter(Boolean)).toHaveLength(1);expect(scoreResumeAgainstJob).toHaveBeenCalledTimes(1); expect((await prisma.jobApplication.findUniqueOrThrow({where:{id:appId}})).matchScore).toBe(83);expect((await prisma.usageCounter.findUniqueOrThrow({where:{organizationId_period:{organizationId:orgId,period:"trial"}}})).aiScores).toBe(1);
  });
  it("retries provider failures with backoff and stops after three attempts",async()=>{
    await queueAiScore(prisma,appId); state.score=null;
    for(let i=0;i<3;i++){await prisma.aiScoringJob.update({where:{applicationId:appId},data:{availableAt:new Date(0)}});expect(await processAiScoringJob(appId)).toBe(false);}
    const job=await prisma.aiScoringJob.findUniqueOrThrow({where:{applicationId:appId}});expect(job.attempts).toBe(3);expect(job.failedAt).not.toBeNull();expect(job.lastErrorCode).toBe("PROVIDER_UNAVAILABLE");expect(await processAiScoringJob(appId)).toBe(false);state.score={matchScore:83,summary:"Relevant experience"};
  });
});
