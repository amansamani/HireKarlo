import 'dotenv/config';
import { Pool } from 'pg';
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:10000,max:1});
try {
  const checks={
    orphanOwners:'SELECT count(*)::int AS count FROM "Organization" o LEFT JOIN "User" u ON u.id=o."ownerId" WHERE u.id IS NULL',
    unknownMembershipRoles:`SELECT count(*)::int AS count FROM "Membership" WHERE role NOT IN ('OWNER','ADMIN','RECRUITER','INTERVIEWER')`,
    unknownInviteRoles:`SELECT count(*)::int AS count FROM "TeamInvite" WHERE role NOT IN ('ADMIN','RECRUITER','INTERVIEWER')`,
    invalidDurations:'SELECT count(*)::int AS count FROM "Interview" WHERE "durationMinutes" NOT BETWEEN 15 AND 480',
    invalidRatings:'SELECT count(*)::int AS count FROM "Interview" WHERE (rating IS NOT NULL AND rating NOT BETWEEN 1 AND 5) OR ("interviewerRating" IS NOT NULL AND "interviewerRating" NOT BETWEEN 1 AND 5)',
    invalidScores:'SELECT count(*)::int AS count FROM "JobApplication" WHERE "matchScore" IS NOT NULL AND "matchScore" NOT BETWEEN 0 AND 100',
  };
  const results={};for(const [name,sql]of Object.entries(checks))results[name]=(await pool.query(sql)).rows[0].count;
  console.log(JSON.stringify({readOnly:true,checks:results},null,2));
  if(Object.values(results).some(count=>count>0))process.exitCode=1;
} catch {console.error('Database preflight failed. Check connectivity/schema without sharing connection credentials.');process.exitCode=1;}
finally {await pool.end();}
