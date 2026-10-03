import type { Prisma, PrismaClient } from "@prisma/client";
import type { RegistrationAuditInput, RegistrationAuditRecorder } from "../domain/repositories/registration-audit.js";
import type { RegistrationStores, RegistrationUnitOfWork } from "../domain/repositories/registration-unit-of-work.js";
import { PrismaFamilyRepository } from "./repositories/prisma-family.repository.js";
import { PrismaMembershipRepository } from "./repositories/prisma-membership.repository.js";
import { PrismaPersonRepository } from "./repositories/prisma-person.repository.js";

function toJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (value === null) return undefined;
  return value as unknown as Prisma.InputJsonValue;
}

export class PrismaRegistrationAuditRecorder implements RegistrationAuditRecorder {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async recordAudit(input: RegistrationAuditInput): Promise<void> {
    await this.prisma.auditEntry.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorId: input.actorId,
        occurredAt: new Date(input.occurredAt),
        before: toJson(input.before),
        after: toJson(input.after),
        reason: input.reason,
      },
    });
  }
}

export class PrismaRegistrationUnitOfWork implements RegistrationUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async transactional<T>(work: (stores: RegistrationStores) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const stores: RegistrationStores = {
        families: new PrismaFamilyRepository(tx),
        persons: new PrismaPersonRepository(tx),
        memberships: new PrismaMembershipRepository(tx),
        audits: new PrismaRegistrationAuditRecorder(tx),
      };
      return work(stores);
    });
  }
}
