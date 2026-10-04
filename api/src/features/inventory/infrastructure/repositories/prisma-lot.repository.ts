import type { PrismaClient, Prisma } from "@prisma/client";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import type { LotRepository } from "../../domain/repositories/lot.repository.js";

type LotRow = {
  id: string;
  itemId: string;
  unitId: string;
  receiptLineId: string | null;
  countLineId: string | null;
  expiresOn: Date | null;
};

function toEntity(row: LotRow): StockLot {
  return StockLot.rehydrate({
    id: row.id,
    itemId: row.itemId,
    unitId: row.unitId,
    receiptLineId: row.receiptLineId,
    countLineId: row.countLineId,
    expiresOn: row.expiresOn === null ? null : row.expiresOn.toISOString().slice(0, 10),
  });
}

export class PrismaLotRepository implements LotRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async save(lot: StockLot): Promise<void> {
    await this.prisma.stockLot.upsert({
      where: { id: lot.id },
      create: {
        id: lot.id,
        itemId: lot.itemId,
        unitId: lot.unitId,
        receiptLineId: lot.receiptLineId,
        countLineId: lot.countLineId,
        expiresOn: lot.expiresOn === null ? null : new Date(lot.expiresOn),
      },
      update: {
        expiresOn: lot.expiresOn === null ? null : new Date(lot.expiresOn),
      },
    });
  }

  async findById(id: string): Promise<StockLot | null> {
    const row = await this.prisma.stockLot.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row as unknown as LotRow);
  }

  async findByReceiptLineId(receiptLineId: string): Promise<StockLot | null> {
    const row = await this.prisma.stockLot.findUnique({ where: { receiptLineId } });
    if (row === null) return null;
    return toEntity(row as unknown as LotRow);
  }

  async findByItem(itemId: string): Promise<StockLot[]> {
    const rows = await this.prisma.stockLot.findMany({ where: { itemId } });
    return rows.map((row) => toEntity(row as unknown as LotRow));
  }

  async listAll(): Promise<StockLot[]> {
    const rows = await this.prisma.stockLot.findMany();
    return rows.map((row) => toEntity(row as unknown as LotRow));
  }
}
