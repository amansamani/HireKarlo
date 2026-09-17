import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logError } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const configuredMax = Number(process.env.DATABASE_POOL_MAX || 5);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number.isInteger(configuredMax) && configuredMax >= 1 && configuredMax <= 20 ? configuredMax : 5, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, query_timeout: 10_000 });
  pool.on("error", error => logError("database.idle_connection_failed", error));
  
  const adapter = new PrismaPg(pool);
  
  prismaInstance = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;
