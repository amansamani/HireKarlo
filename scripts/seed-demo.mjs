import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connection=new URL(process.env.DATABASE_URL||'postgresql://invalid/');
if(connection.pathname!=='/hirekarlo_audit'||!['localhost','127.0.0.1'].includes(connection.hostname))throw Error('Demo seed only supports local hirekarlo_audit; never production');
const password=process.env.SEED_DEMO_PASSWORD||'';
if(Buffer.byteLength(password)>72||password.length<8||!/[A-Z]/.test(password)||!/[0-9]/.test(password)||!/[\W_]/.test(password))throw Error('Set SEED_DEMO_PASSWORD with 8+ characters, upper case, number, symbol and at most 72 UTF-8 bytes');
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
const db=new PrismaClient({adapter:new PrismaPg(pool)});
try {
  await db.$transaction(async tx=>{
    const email='demo-owner@example.test';
    const user=await tx.user.upsert({where:{email},create:{email,name:'Demo owner',password:await bcrypt.hash(password,12),emailVerified:new Date()},update:{}});
    const existing=await tx.organization.findFirst({where:{ownerId:user.id,name:'Local demo'}});
    if(existing)return;
    const org=await tx.organization.create({data:{name:'Local demo',ownerId:user.id}});
    await tx.membership.create({data:{organizationId:org.id,userId:user.id,role:'OWNER'}});
    const client=await tx.agencyClient.create({data:{organizationId:org.id,name:'Example client'}});
    const job=await tx.job.create({data:{organizationId:org.id,userId:user.id,clientId:client.id,title:'Demo frontend engineer',department:'Engineering',location:'Remote',type:'Full-time',description:'Synthetic demonstration role only',interviewRounds:['Interview']}});
    const candidate=await tx.candidate.create({data:{organizationId:org.id,recruiterId:user.id,fullName:'Synthetic candidate',email:'demo-candidate@example.test',experience:3,skills:['TypeScript']}});
    await tx.jobApplication.create({data:{candidateId:candidate.id,jobId:job.id,stage:'APPLIED'}});
  });
  console.log('Local demo ready: demo-owner@example.test. Use your configured seed password; an existing account is not overwritten.');
} finally {await db.$disconnect();await pool.end();}
