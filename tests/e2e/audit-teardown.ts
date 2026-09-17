import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { assertAuditDatabase } from "../helpers/audit-db";
export default async function teardown() {
  if(process.env.E2E_AUDIT_DB!=="true" || !process.env.E2E_PREFIX) return;
  assertAuditDatabase();
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1}),db=new PrismaClient({adapter:new PrismaPg(pool)});
  try {
    const users=await db.user.findMany({where:{email:{startsWith:process.env.E2E_PREFIX}},select:{id:true}}),ids=users.map(u=>u.id);
    await db.$transaction(async tx => {
      await tx.activityLog.deleteMany({where:{userId:{in:ids}}});
      await tx.interview.deleteMany({where:{application:{job:{organization:{ownerId:{in:ids}}}}}});
      await tx.organization.deleteMany({where:{ownerId:{in:ids}}});
      await tx.user.deleteMany({where:{id:{in:ids}}});
      await tx.emailOutbox.deleteMany({where:{recipient:{startsWith:process.env.E2E_PREFIX}}});
    });
  } finally {await db.$disconnect();await pool.end();}
}
