import { Prisma, type PrismaClient } from "@prisma/client";
import { BazarTransfer } from "../../domain/entities/bazar-transfer.entity.js";
import { StockReceipt } from "../../domain/entities/stock-receipt.entity.js";
import type { ReceiptLine } from "../../domain/entities/receipt-line.entity.js";
import type { StockLot } from "../../domain/entities/stock-lot.entity.js";
import type { StockMovement } from "../../domain/entities/stock-movement.entity.js";
import { ReceiptOperationConflictError } from "../../domain/errors/receipt-operation-conflict.error.js";
import type { BazarTransferFilters, BazarTransferRepository } from "../../domain/repositories/bazar-transfer.repository.js";

type TransferRow = {
  id: string;
  receiptId: string;
  externalReference: string;
};

type ReceiptRow = {
  id: string;
  originType: "PERSON" | "ORGANIZATION" | "CAMPAIGN" | "BAZAR" | "AD_HOC" | "UNKNOWN";
  donorName: string | null;
  receivedBy: string;
  receivedAt: Date;
  note: string | null;
  operationKey: string;
  fingerprint: string;
};

function toEntity(row: TransferRow): BazarTransfer {
  return BazarTransfer.rehydrate({ id: row.id, receiptId: row.receiptId, externalReference: row.externalReference });
}

export class PrismaBazarTransferRepository implements BazarTransferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveFull(transfer: BazarTransfer, receipt: StockReceipt, lines: ReceiptLine[], lots: StockLot[], movements: StockMovement[]): Promise<void> {
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
        await tx.bazarTransfer.create({
          data: { id: transfer.id, receiptId: transfer.receiptId, externalReference: transfer.externalReference },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ReceiptOperationConflictError(receipt.operationKey);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<BazarTransfer | null> {
    const row = await this.prisma.bazarTransfer.findUnique({ where: { id } });
    if (row === null) return null;
    return toEntity(row as unknown as TransferRow);
  }

  async findByExternalReference(externalReference: string): Promise<BazarTransfer | null> {
    const row = await this.prisma.bazarTransfer.findFirst({ where: { externalReference } });
    if (row === null) return null;
    return toEntity(row as unknown as TransferRow);
  }

  async findReceiptByTransferId(transferId: string): Promise<StockReceipt | null> {
    const transfer = await this.prisma.bazarTransfer.findUnique({ where: { id: transferId } });
    if (transfer === null) return null;
    const row = await this.prisma.stockReceipt.findUnique({ where: { id: (transfer as unknown as TransferRow).receiptId } });
    if (row === null) return null;
    const typed = row as unknown as ReceiptRow;
    return StockReceipt.rehydrate({
      id: typed.id,
      originType: typed.originType,
      donorName: typed.donorName,
      receivedBy: typed.receivedBy,
      receivedAt: typed.receivedAt.toISOString().slice(0, 10) as never,
      note: typed.note,
      operationKey: typed.operationKey,
      fingerprint: typed.fingerprint,
    });
  }

  async list(filters: BazarTransferFilters): Promise<BazarTransfer[]> {
    void filters;
    const rows = await this.prisma.bazarTransfer.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => toEntity(row as unknown as TransferRow));
  }
}
