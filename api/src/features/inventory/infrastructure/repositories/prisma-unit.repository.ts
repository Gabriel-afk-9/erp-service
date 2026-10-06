import { Prisma, type PrismaClient } from "@prisma/client";
import { normalizeSymbol, Unit } from "../../domain/entities/unit.entity.js";
import { UnitSymbolAlreadyExistsError } from "../../domain/errors/unit-symbol-already-exists.error.js";
import type { UnitRepository } from "../../domain/repositories/unit.repository.js";
import type { InventoryPrismaClient } from "./prisma-category.repository.js";

export type { InventoryPrismaClient };

type UnitRow = {
  id: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  quantityIncrement: unknown;
  isActive: boolean;
  revision: number;
};

function toEntity(row: UnitRow): Unit {
  return Unit.rehydrate({
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    decimalPlaces: row.decimalPlaces,
    quantityIncrement: Number(row.quantityIncrement),
    isActive: row.isActive,
    revision: row.revision,
  });
}

export class PrismaUnitRepository implements UnitRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async save(unit: Unit): Promise<void> {
    try {
      await this.prisma.unit.upsert({
        where: { id: unit.id },
        create: {
          id: unit.id,
          symbol: unit.symbol,
          name: unit.name,
          decimalPlaces: unit.decimalPlaces,
          quantityIncrement: unit.quantityIncrement,
          isActive: unit.isActive,
          revision: unit.revision,
        },
        update: {
          symbol: unit.symbol,
          name: unit.name,
          decimalPlaces: unit.decimalPlaces,
          quantityIncrement: unit.quantityIncrement,
          isActive: unit.isActive,
          revision: unit.revision,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new UnitSymbolAlreadyExistsError(unit.symbol);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Unit | null> {
    const row = await this.prisma.unit.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row as unknown as UnitRow);
  }

  async findBySymbol(symbol: string): Promise<Unit | null> {
    const normalized = normalizeSymbol(symbol);
    const row = await this.prisma.unit.findFirst({ where: { symbol: normalized } });
    if (row === null) return null;
    return toEntity(row as unknown as UnitRow);
  }

  async listAll(onlyActive?: boolean): Promise<Unit[]> {
    const rows = await this.prisma.unit.findMany({
      where: onlyActive === false ? {} : { isActive: true },
      orderBy: { symbol: "asc" },
    });
    return rows.map((row) => toEntity(row as unknown as UnitRow));
  }
}
