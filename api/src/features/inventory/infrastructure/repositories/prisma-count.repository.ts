import type { PrismaClient, Prisma } from "@prisma/client";
import { StockCount, StockCountLine } from "../../domain/entities/stock-count.entity.js";
import type { CountRepository } from "../../domain/repositories/count.repository.js";

type CountRow = {
  id: string;
  conductedBy: string;
  conductedAt: Date;
  closedAt: Date | null;
  note: string | null;
};

type CountLineRow = {
  id: string;
  countId: string;
  itemId: string;
  unitId: string;
  lotId: string | null;
  expiresOn: Date | null;
  expectedQuantity: unknown;
  countedQuantity: unknown;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class PrismaCountRepository implements CountRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async saveCount(count: StockCount): Promise<void> {
    await this.prisma.stockCount.upsert({
      where: { id: count.id },
      create: {
        id: count.id,
        conductedBy: count.conductedBy,
        conductedAt: new Date(count.conductedAt),
        closedAt: count.closedAt === null ? null : new Date(count.closedAt),
        note: count.note,
      },
      update: {
        closedAt: count.closedAt === null ? null : new Date(count.closedAt),
      },
    });
  }

  async saveLine(line: StockCountLine): Promise<void> {
    await this.prisma.stockCountLine.create({
      data: {
        id: line.id,
        countId: line.countId,
        itemId: line.itemId,
        unitId: line.unitId,
        lotId: line.lotId,
        expiresOn: line.expiresOn === null ? null : new Date(line.expiresOn),
        expectedQuantity: line.expectedQuantity,
        countedQuantity: line.countedQuantity,
      },
    });
  }

  async updateLine(line: StockCountLine): Promise<void> {
    await this.prisma.stockCountLine.update({
      where: { id: line.id },
      data: { countedQuantity: line.countedQuantity },
    });
  }

  async findCountById(id: string): Promise<StockCount | null> {
    const row = await this.prisma.stockCount.findUnique({ where: { id } });
    if (row === null) return null;
    const typed = row as unknown as CountRow;
    return StockCount.rehydrate({
      id: typed.id,
      conductedBy: typed.conductedBy,
      conductedAt: toDateOnly(typed.conductedAt) as never,
      closedAt: typed.closedAt === null ? null : (toDateOnly(typed.closedAt) as never),
      note: typed.note,
    });
  }

  async findLinesByCountId(countId: string): Promise<StockCountLine[]> {
    const rows = await this.prisma.stockCountLine.findMany({ where: { countId } });
    return rows.map((row) => {
      const typed = row as unknown as CountLineRow;
      return StockCountLine.rehydrate({
        id: typed.id,
        countId: typed.countId,
        itemId: typed.itemId,
        unitId: typed.unitId,
        lotId: typed.lotId,
        expiresOn: typed.expiresOn === null ? null : toDateOnly(typed.expiresOn),
        expectedQuantity: Number(typed.expectedQuantity),
        countedQuantity: Number(typed.countedQuantity),
      });
    });
  }

  async findLineByLot(countId: string, lotId: string): Promise<StockCountLine | null> {
    const row = await this.prisma.stockCountLine.findFirst({ where: { countId, lotId } });
    if (row === null) return null;
    const typed = row as unknown as CountLineRow;
    return StockCountLine.rehydrate({
      id: typed.id,
      countId: typed.countId,
      itemId: typed.itemId,
      unitId: typed.unitId,
      lotId: typed.lotId,
      expiresOn: typed.expiresOn === null ? null : toDateOnly(typed.expiresOn),
      expectedQuantity: Number(typed.expectedQuantity),
      countedQuantity: Number(typed.countedQuantity),
    });
  }
}
