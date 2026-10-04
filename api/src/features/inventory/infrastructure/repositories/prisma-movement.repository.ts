import { Prisma, type PrismaClient } from "@prisma/client";
import { StockMovement, type MovementType } from "../../domain/entities/stock-movement.entity.js";
import { DuplicateOpeningBalanceError } from "../../domain/errors/duplicate-opening-balance.error.js";
import type { MovementRepository } from "../../domain/repositories/movement.repository.js";

type MovementRow = {
  id: string;
  itemId: string;
  unitId: string;
  lotId: string | null;
  receiptLineId: string | null;
  countLineId: string | null;
  type: MovementType;
  quantity: unknown;
  balanceDelta: unknown;
  occurredAt: Date;
  recordedBy: string;
  reason: string | null;
  operationKey: string | null;
  reversesMovementId?: string | null;
};

function toEntity(row: MovementRow): StockMovement {
  return StockMovement.rehydrate({
    id: row.id,
    itemId: row.itemId,
    unitId: row.unitId,
    lotId: row.lotId,
    receiptLineId: row.receiptLineId,
    countLineId: row.countLineId,
    type: row.type,
    quantity: Number(row.quantity),
    balanceDelta: Number(row.balanceDelta),
    occurredAt: row.occurredAt.toISOString().slice(0, 10) as never,
    recordedBy: row.recordedBy,
    reason: row.reason,
    operationKey: row.operationKey,
    reversesMovementId: row.reversesMovementId ?? null,
  });
}

export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async append(movement: StockMovement): Promise<void> {
    try {
      await this.prisma.stockMovement.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        if (movement.type === "OPENING_BALANCE") {
          throw new DuplicateOpeningBalanceError(movement.itemId);
        }
        // Idempotent replay: the operation key already produced a movement.
        const replay = await this.findByOperationKey(movement.operationKey ?? "");
        if (replay !== null) return;
      }
      throw error;
    }
  }

  async findByOperationKey(operationKey: string): Promise<StockMovement | null> {
    if (operationKey === "") return null;
    const row = await this.prisma.stockMovement.findUnique({ where: { operationKey } });
    if (row === null) return null;
    return toEntity(row as unknown as MovementRow);
  }

  async hasOpeningBalance(itemId: string): Promise<boolean> {
    const count = await this.prisma.stockMovement.count({ where: { itemId, type: "OPENING_BALANCE" } });
    return count > 0;
  }

  async sumDeltaByItem(itemId: string, to?: string): Promise<number> {
    const result = await this.prisma.stockMovement.aggregate({
      _sum: { balanceDelta: true },
      where: { itemId, ...(to ? { occurredAt: { lte: new Date(to) } } : {}) },
    });
    return Number(result._sum.balanceDelta ?? 0);
  }

  async sumDeltaByLot(lotId: string, to?: string): Promise<number> {
    const result = await this.prisma.stockMovement.aggregate({
      _sum: { balanceDelta: true },
      where: { lotId, ...(to ? { occurredAt: { lte: new Date(to) } } : {}) },
    });
    return Number(result._sum.balanceDelta ?? 0);
  }

  async listByItem(itemId: string, to?: string): Promise<StockMovement[]> {
    const rows = await this.prisma.stockMovement.findMany({
      where: { itemId, ...(to ? { occurredAt: { lte: new Date(to) } } : {}) },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => toEntity(row as unknown as MovementRow));
  }
}
