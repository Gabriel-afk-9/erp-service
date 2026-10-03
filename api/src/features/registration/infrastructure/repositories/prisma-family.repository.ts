import { Prisma, type PrismaClient } from "@prisma/client";
import { Family } from "../../domain/entities/family.entity.js";
import { FamilyCodeAlreadyExistsError } from "../../domain/errors/family-code-already-exists.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { Page, Pagination } from "../../domain/repositories/pagination.js";
import { buildFamilySearchText, normalizeSearchText } from "../normalization.js";

export type RegistrationPrismaClient = PrismaClient | Prisma.TransactionClient;

type FamilyRow = {
  id: string;
  code: string;
  referenceName: string | null;
  address: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  locationType: "URBAN" | "RURAL";
  contactPhone: string | null;
  revision: number;
};

function toEntity(row: FamilyRow): Family {
  return Family.restore({
    id: row.id,
    code: row.code,
    referenceName: row.referenceName,
    address: row.address,
    neighborhood: row.neighborhood,
    postalCode: row.postalCode,
    locationType: row.locationType,
    contactPhone: row.contactPhone,
    revision: row.revision,
  });
}

export class PrismaFamilyRepository implements FamilyRepository {
  constructor(private readonly prisma: RegistrationPrismaClient) {}

  async save(family: Family): Promise<void> {
    try {
      await this.prisma.family.upsert({
      where: { id: family.id },
      create: {
        id: family.id,
        code: family.code,
        referenceName: family.referenceName,
        address: family.address,
        neighborhood: family.neighborhood,
        postalCode: family.postalCode,
        locationType: family.locationType,
        contactPhone: family.contactPhone,
        searchText: buildFamilySearchText({
          code: family.code,
          referenceName: family.referenceName,
          address: family.address,
          neighborhood: family.neighborhood,
        }),
        revision: family.revision,
      },
      update: {
        referenceName: family.referenceName,
        address: family.address,
        neighborhood: family.neighborhood,
        postalCode: family.postalCode,
        locationType: family.locationType,
        contactPhone: family.contactPhone,
        searchText: buildFamilySearchText({
          code: family.code,
          referenceName: family.referenceName,
          address: family.address,
          neighborhood: family.neighborhood,
        }),
        revision: family.revision,
      },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new FamilyCodeAlreadyExistsError(family.code);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Family | null> {
    const row = await this.prisma.family.findUnique({ where: { id } });
    return row === null ? null : toEntity(row);
  }

  async findByCode(code: string): Promise<Family | null> {
    const row = await this.prisma.family.findUnique({ where: { code } });
    return row === null ? null : toEntity(row);
  }

  async findByQuery(query: string, pagination: Pagination): Promise<Page<Family>> {
    const normalized = normalizeSearchText(query);
    const where = normalized === "" ? {} : { searchText: { contains: normalized } };
    const [total, rows] = await Promise.all([
      this.prisma.family.count({ where }),
      this.prisma.family.findMany({
        where,
        orderBy: [{ code: "asc" }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);
    return { items: rows.map(toEntity), page: pagination.page, pageSize: pagination.pageSize, total };
  }
}
