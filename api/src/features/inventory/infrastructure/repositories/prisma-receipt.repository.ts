import { Prisma, type PrismaClient } from "@prisma/client";
import { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import { StockLot } from "../../domain/entities/stock-lot.entity.js";
import { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { StockReceipt } from "../../domain/entities/stock-receipt.entity.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import type { ReceiptFilters, ReceiptRepository } from "../../domain/repositories/receipt.repository.js";

type ReceiptRow = {
  id: string;
  originType: "PERSON" | "ORGANIZATION" | "CAMPAIGN" | "AD_HOC" | "UNKNOWN";
  donorName: string | null;
  receivedBy: string;
  receivedAt: Date;
  note: string | null;
  operationKey: string;
  fingerprint: string;
};

type LineRow = {
  id: string;
  receiptId: string;
  itemId: string;
  unitId: string;
  informedQuantity: unknown;
  receivedQuantity: unknown;
  acceptedQuantity: unknown;
  rejectedQuantity: unknown;
  rejectionReason: string | null;
  expiresOn: Date | null;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toEntity(row: ReceiptRow): StockReceipt {
  return StockReceipt.rehydrate({
    id: row.id,
    originType: row.originType,
    donorName: row.donorName,
    receivedBy: row.receivedBy,
    receivedAt: toDateOnly(row.receivedAt) as never,
    note: row.note,
    operationKey: row.operationKey,
    fingerprint: row.fingerprint,
  });
}

function toLine(row: LineRow): ReceiptLine {
  return ReceiptLine.rehydrate({
    id: row.id,
    receiptId: row.receiptId,
    itemId: row.itemId,
    unitId: row.unitId,
    informedQuantity: row.informedQuantity === null ? null : Number(row.informedQuantity),
    receivedQuantity: Number(row.receivedQuantity),
    acceptedQuantity: Number(row.acceptedQuantity),
    rejectedQuantity: Number(row.rejectedQuantity),
    rejectionReason: row.rejectionReason,
    expiresOn: row.expiresOn === null ? null : toDateOnly(row.expiresOn),
  });
}

export class PrismaReceiptRepository implements ReceiptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveFull(receipt: StockReceipt, lines: ReceiptLine[], lots: StockLot[], movements: StockMovement[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.stockReceipt.create({
          data: {
            id: receipt.id,
            originType: receipt.originType,
            donorName: receipt.donorName,
            receivedBy: receipt.receivedBy,
            receivedAt: new Date(receipt.receivedAt),
            note: receipt.note,
            operationKey: receipt.operationKey,
            fingerprint: receipt.fingerprint,
          },
        });
        for (const line of lines) {
          await tx.receiptLine.create({
            data: {
              id: line.id,
              receiptId: line.receiptId,
              itemId: line.itemId,
              unitId: line.unitId,
              informedQuantity: line.informedQuantity,
              receivedQuantity: line.receivedQuantity,
              acceptedQuantity: line.acceptedQuantity,
              rejectedQuantity: line.rejectedQuantity,
              rejectionReason: line.rejectionReason,
              expiresOn: line.expiresOn === null ? null : new Date(line.expiresOn),
            },
          });
        }
        for (const lot of lots) {
          await tx.stockLot.create({
            data: {
              id: lot.id,
              itemId: lot.itemId,
              unitId: lot.unitId,
              receiptLineId: lot.receiptLineId,
              countLineId: lot.countLineId,
              expiresOn: lot.expiresOn === null ? null : new Date(lot.expiresOn),
            },
          });
        }
        for (const movement of movements) {
          await tx.stockMovement.create({
            data: {
              id: movement.id,
              itemId: movement.itemId,
              unitId: movement.unitId,
              lotId: movement.lotId,
              receiptLineId: movement.receiptLineId,
              countLineId: movement.countLineId,
              type: movement.type,
              quantity: movement.quantity,
              balanceDelta: movement.balanceDelta,
              occurredAt: new Date(movement.occurredAt),
              recordedBy: movement.recordedBy,
              reason: movement.reason,
              operationKey: movement.operationKey,
            },
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ReceiptOperationConflictError(receipt.operationKey);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<StockReceipt | null> {
    const row = await this.prisma.stockReceipt.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row as unknown as ReceiptRow);
  }

  async findByOperationKey(operationKey: string): Promise<StockReceipt | null> {
    const row = await this.prisma.stockReceipt.findUnique({ where: { operationKey } });
    if (row === null) return null;
    return toEntity(row as unknown as ReceiptRow);
  }

  async findLinesByReceiptId(receiptId: string): Promise<ReceiptLine[]> {
    const rows = await this.prisma.receiptLine.findMany({ where: { receiptId } });
    return rows.map((row) => toLine(row as unknown as LineRow));
  }

  async list(filters: ReceiptFilters): Promise<StockReceipt[]> {
    const rows = await this.prisma.stockReceipt.findMany({
      where: {
        ...(filters.originType ? { originType: filters.originType as never } : {}),
        ...(filters.from ? { receivedAt: { gte: new Date(filters.from) } } : {}),
        ...(filters.to ? { receivedAt: { lte: new Date(filters.to) } } : {}),
      },
      orderBy: { receivedAt: "desc" },
    });
    return rows.map((row) => toEntity(row as unknown as ReceiptRow));
  }
}
