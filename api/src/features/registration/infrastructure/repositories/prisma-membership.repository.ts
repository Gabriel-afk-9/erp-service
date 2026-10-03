import type { CivilDate } from "../../../../shared/domain/value-objects/civil-date.value-object.js";
import { FamilyMembership } from "../../domain/entities/family-membership.entity.js";
import { HolderAlreadyExistsError } from "../../domain/errors/holder-already-exists.error.js";
import { PersonAlreadyMemberError } from "../../domain/errors/person-already-member.error.js";
import type { MembershipRepository } from "../../domain/repositories/membership.repository.js";
import type { RegistrationPrismaClient } from "./prisma-family.repository.js";
import { Prisma } from "@prisma/client";

function toCivilDate(value: Date): CivilDate {
  return value.toISOString().slice(0, 10) as CivilDate;
}

type MembershipRow = {
  id: string;
  personId: string;
  familyId: string;
  relationshipToReference: string | null;
  isReference: boolean;
  validFrom: Date;
  validUntil: Date | null;
  revision: number;
};

function toEntity(row: MembershipRow): FamilyMembership {
  return FamilyMembership.restore({
    id: row.id,
    personId: row.personId,
    familyId: row.familyId,
    relationshipToReference: row.relationshipToReference,
    isReference: row.isReference,
    validFrom: toCivilDate(row.validFrom),
    validUntil: row.validUntil === null ? null : toCivilDate(row.validUntil),
    revision: row.revision,
  });
}

function asOfClause(asOf: CivilDate): { validFrom: { lte: Date }; OR: object[] } {
  const date = new Date(asOf);
  return { validFrom: { lte: date }, OR: [{ validUntil: null }, { validUntil: { gt: date } }] };
}

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: RegistrationPrismaClient) {}

  async save(membership: FamilyMembership): Promise<void> {
    try {
      await this.prisma.familyMembership.upsert({
      where: { id: membership.id },
      create: {
        id: membership.id,
        personId: membership.personId,
        familyId: membership.familyId,
        relationshipToReference: membership.relationshipToReference,
        isReference: membership.isReference,
        validFrom: new Date(membership.validFrom),
        validUntil: membership.validUntil === null ? null : new Date(membership.validUntil),
        revision: membership.revision,
      },
      update: {
        relationshipToReference: membership.relationshipToReference,
        isReference: membership.isReference,
        validFrom: new Date(membership.validFrom),
        validUntil: membership.validUntil === null ? null : new Date(membership.validUntil),
        revision: membership.revision,
      },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = JSON.stringify(error.meta?.target ?? "");
        if (target.includes("membership_active_holder_idx")) {
          throw new HolderAlreadyExistsError(membership.familyId);
        }
        throw new PersonAlreadyMemberError(membership.personId);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<FamilyMembership | null> {
    const row = await this.prisma.familyMembership.findUnique({ where: { id } });
    return row === null ? null : toEntity(row);
  }

  async findActiveByPerson(personId: string, asOf: CivilDate): Promise<FamilyMembership | null> {
    const row = await this.prisma.familyMembership.findFirst({
      where: { personId, ...asOfClause(asOf) },
      orderBy: [{ validFrom: "desc" }],
    });
    return row === null ? null : toEntity(row);
  }

  async findActiveByFamily(familyId: string, asOf: CivilDate): Promise<FamilyMembership[]> {
    const rows = await this.prisma.familyMembership.findMany({
      where: { familyId, ...asOfClause(asOf) },
      orderBy: [{ validFrom: "asc" }],
    });
    return rows.map(toEntity);
  }

  async findAllByFamily(familyId: string): Promise<FamilyMembership[]> {
    const rows = await this.prisma.familyMembership.findMany({
      where: { familyId },
      orderBy: [{ validFrom: "asc" }],
    });
    return rows.map(toEntity);
  }

  async findOverlapping(personId: string, from: CivilDate, to: CivilDate | null): Promise<FamilyMembership[]> {
    const rows = await this.prisma.familyMembership.findMany({
      where: {
        personId,
        validFrom: to === null ? undefined : { lt: new Date(to) },
        OR: [{ validUntil: null }, { validUntil: { gt: new Date(from) } }],
      },
    });
    return rows.map(toEntity);
  }
}
