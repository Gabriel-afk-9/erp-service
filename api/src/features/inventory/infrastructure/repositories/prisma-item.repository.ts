import { Prisma, type PrismaClient } from "@prisma/client";
import { Item } from "../../domain/entities/item.entity.js";
import { ItemNameAlreadyExistsInCategoryError } from "../../domain/errors/item-name-already-exists-in-category.error.js";
import type { ItemQueryFilters, ItemRepository } from "../../domain/repositories/item.repository.js";

type ItemRow = {
  id: string;
  categoryId: string;
  unitId: string;
  name: string;
  description: string | null;
  requiresExpiration: boolean;
  isActive: boolean;
  revision: number;
};

function toEntity(row: ItemRow): Item {
  return Item.rehydrate({
    id: row.id,
    categoryId: row.categoryId,
    unitId: row.unitId,
    name: row.name,
    description: row.description,
    requiresExpiration: row.requiresExpiration,
    isActive: row.isActive,
    revision: row.revision,
  });
}

export class PrismaItemRepository implements ItemRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async save(item: Item): Promise<void> {
    try {
      await this.prisma.item.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          categoryId: item.categoryId,
          unitId: item.unitId,
          name: item.name,
          description: item.description,
          requiresExpiration: item.requiresExpiration,
          isActive: item.isActive,
          revision: item.revision,
        },
        update: {
          categoryId: item.categoryId,
          unitId: item.unitId,
          name: item.name,
          description: item.description,
          requiresExpiration: item.requiresExpiration,
          isActive: item.isActive,
          revision: item.revision,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ItemNameAlreadyExistsInCategoryError(item.name);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Item | null> {
    const row = await this.prisma.item.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row);
  }

  async findByCategoryAndName(categoryId: string, name: string): Promise<Item | null> {
    const row = await this.prisma.item.findFirst({
      where: { categoryId, name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (row === null) return null;
    return toEntity(row);
  }

  async findByQuery(query: string, filters?: ItemQueryFilters): Promise<Item[]> {
    const trimmed = query.trim();
    const rows = await this.prisma.item.findMany({
      where: {
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.onlyActive === false ? {} : { isActive: true }),
        ...(trimmed === "" ? {} : { name: { contains: trimmed, mode: "insensitive" } }),
      },
      orderBy: { name: "asc" },
    });
    return rows.map(toEntity);
  }
}
