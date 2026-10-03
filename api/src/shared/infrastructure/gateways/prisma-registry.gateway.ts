import type { PrismaClient } from "@prisma/client";
import type {
  FamilySnapshot,
  MembershipSnapshot,
  RegistryGateway,
} from "../../domain/gateways/registry.gateway.js";

function normalizeQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

type MembershipRow = {
  id: string;
  familyId: string;
  personId: string;
  relationshipToReference: string | null;
  isReference: boolean;
  validFrom: Date;
  validUntil: Date | null;
  revision: number;
  person: { name: string };
};

function toCivilDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toMembershipSnapshot(row: MembershipRow): MembershipSnapshot {
  return {
    membershipId: row.id,
    familyId: row.familyId,
    personId: row.personId,
    personName: row.person.name,
    relationship: row.relationshipToReference,
    isHolder: row.isReference,
    startDate: toCivilDate(row.validFrom),
    endDate: row.validUntil === null ? null : toCivilDate(row.validUntil),
    revision: row.revision,
  };
}

export class PrismaRegistryGateway implements RegistryGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async findFamily(familyId: string): Promise<FamilySnapshot | null> {
    const row = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (row === null) return null;
    return {
      familyId: row.id,
      familyNumber: row.code,
      address: {
        // Registry snapshots require address strings; CAD stores them as nullable.
        street: row.address ?? "",
        neighborhood: row.neighborhood ?? "",
        zipCode: row.postalCode ?? "",
        locationType: row.locationType,
      },
      phone: row.contactPhone,
      revision: row.revision,
    };
  }

  async findFamiliesByQuery(query: string): Promise<FamilySnapshot[]> {
    const normalized = normalizeQuery(query);
    if (normalized === "") return [];
    const rows = await this.prisma.family.findMany({
      where: { searchText: { contains: normalized } },
      orderBy: [{ code: "asc" }],
      take: 50,
    });
    return rows.map((row) => ({
      familyId: row.id,
      familyNumber: row.code,
      address: {
        street: row.address ?? "",
        neighborhood: row.neighborhood ?? "",
        zipCode: row.postalCode ?? "",
        locationType: row.locationType,
      },
      phone: row.contactPhone,
      revision: row.revision,
    }));
  }

  async resolveMembership(personId: string, asOf: string): Promise<MembershipSnapshot | null> {
    const date = new Date(asOf);
    const row = await this.prisma.familyMembership.findFirst({
      where: {
        personId,
        validFrom: { lte: date },
        OR: [{ validUntil: null }, { validUntil: { gt: date } }],
      },
      include: { person: { select: { name: true } } },
      orderBy: [{ validFrom: "desc" }],
    });
    return row === null ? null : toMembershipSnapshot(row as MembershipRow);
  }

  async listActiveMemberships(familyId: string, asOf: string): Promise<MembershipSnapshot[]> {
    const date = new Date(asOf);
    const rows = await this.prisma.familyMembership.findMany({
      where: {
        familyId,
        validFrom: { lte: date },
        OR: [{ validUntil: null }, { validUntil: { gt: date } }],
      },
      include: { person: { select: { name: true } } },
      orderBy: [{ validFrom: "asc" }],
    });
    return rows.map((row) => toMembershipSnapshot(row as MembershipRow));
  }
}
