import { Prisma, type PrismaClient } from "@prisma/client";
import { Category } from "../../domain/entities/category.entity.js";
import { CategoryNameAlreadyExistsError } from "../../domain/errors/category-name-already-exists.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";

export type InventoryPrismaClient = PrismaClient | Prisma.TransactionClient;

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  revision: number;
};

function toEntity(row: CategoryRow): Category {
  return Category.rehydrate({
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    revision: row.revision,
  });
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: InventoryPrismaClient) {}

  async save(category: Category): Promise<void> {
    try {
      await this.prisma.category.upsert({
        where: { id: category.id },
        create: {
          id: category.id,
          name: category.name,
          description: category.description,
          isActive: category.isActive,
          revision: category.revision,
        },
        update: {
          name: category.name,
          description: category.description,
          isActive: category.isActive,
          revision: category.revision,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new CategoryNameAlreadyExistsError(category.name);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row);
  }

  async findByName(name: string): Promise<Category | null> {
    const row = await this.prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (row === null) return null;
    return toEntity(row);
  }

  async findByQuery(query: string, onlyActive?: boolean): Promise<Category[]> {
    const trimmed = query.trim();
    const rows = await this.prisma.category.findMany({
      where: {
        ...(onlyActive === false ? {} : { isActive: true }),
        ...(trimmed === ""
          ? {}
          : {
              OR: [
                { name: { contains: trimmed, mode: "insensitive" } },
                { description: { contains: trimmed, mode: "insensitive" } },
              ],
            }),
      },
      orderBy: { name: "asc" },
    });
    return rows.map(toEntity);
  }
}
