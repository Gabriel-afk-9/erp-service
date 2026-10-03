import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { erpPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.erpPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.erpPrisma = prisma;
}
