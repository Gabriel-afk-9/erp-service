import type { PrismaClient } from "@prisma/client";
import type {
  DeliveryReportFilters,
  DeliveryReportRow,
  DeliveryReportSnapshot,
  DeliveryStatusFilter,
  ReportRepository,
  StockMovementRow,
  StockReportFilters,
  StockReportSnapshot,
} from "../../domain/repositories/report.repository.js";

function toISODate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toISOInstant(value: Date): string {
  return value.toISOString();
}

function maxInstant(current: string | null, candidate: Date): string {
  const instant = toISOInstant(candidate);
  if (current === null || instant > current) return instant;
  return current;
}

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async readStockSnapshot(filters: StockReportFilters): Promise<StockReportSnapshot> {
    const from = new Date(`${filters.from}T00:00:00.000Z`);
    const to = new Date(`${filters.to}T00:00:00.000Z`);
    const movementWhere = {
      ...(filters.movementType ? { type: filters.movementType } : {}),
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      occurredAt: { gte: from, lte: to },
    };

    const [opening, movements] = await this.prisma.$transaction([
      this.prisma.stockMovement.aggregate({
        _sum: { balanceDelta: true },
        where: {
          ...(filters.movementType ? { type: filters.movementType } : {}),
          ...(filters.itemId ? { itemId: filters.itemId } : {}),
          occurredAt: { lt: from },
        },
      }),
      this.prisma.stockMovement.findMany({
        where: movementWhere,
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      }),
    ]);

    const itemIds = [...new Set(movements.map((movement) => movement.itemId))];
    const [items, units] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where: { id: { in: itemIds } },
        include: { category: true },
      }),
      this.prisma.unit.findMany({}),
    ]);
    const itemById = new Map(items.map((item) => [item.id, item]));
    const unitById = new Map(units.map((unit) => [unit.id, unit]));

    const rows: StockMovementRow[] = [];
    let maxRevision: string | null = null;
    for (const movement of movements) {
      const item = itemById.get(movement.itemId);
      if (!item) continue;
      if (filters.categoryId && item.categoryId !== filters.categoryId) continue;
      const unit = unitById.get(movement.unitId);
      maxRevision = maxInstant(maxRevision, movement.updatedAt);
      rows.push({
        movementId: movement.id,
        itemId: item.id,
        itemName: item.name,
        categoryId: item.categoryId,
        categoryName: item.category.name,
        unitId: movement.unitId,
        unitSymbol: unit?.symbol ?? "?",
        lotId: movement.lotId,
        type: movement.type,
        quantity: Number(movement.quantity),
        balanceDelta: Number(movement.balanceDelta),
        occurredAt: toISODate(movement.occurredAt),
        recordedBy: movement.recordedBy,
        reason: movement.reason,
        updatedAt: toISOInstant(movement.updatedAt),
      });
    }

    return {
      openingBalance: Number(opening._sum.balanceDelta ?? 0),
      movements: rows,
      // Deterministic fallback when the snapshot is empty: derived from the
      // filters, so any later insert still changes the fingerprint.
      maxRevision: maxRevision ?? `${filters.to}T23:59:59.999Z`,
    };
  }

  async readDeliverySnapshot(filters: DeliveryReportFilters): Promise<DeliveryReportSnapshot> {
    const from = new Date(`${filters.from}T00:00:00.000Z`);
    const to = new Date(`${filters.to}T00:00:00.000Z`);

    const [deliveries, lines] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where: {
          ...(filters.familyId ? { familyId: filters.familyId } : {}),
          ...(filters.status ? { status: filters.status as DeliveryStatusFilter } : {}),
          occurredAt: { gte: from, lte: to },
        },
        include: { reversal: true },
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      }),
      this.prisma.deliveryLine.findMany({
        where: {
          delivery: {
            ...(filters.familyId ? { familyId: filters.familyId } : {}),
            ...(filters.status ? { status: filters.status as DeliveryStatusFilter } : {}),
            occurredAt: { gte: from, lte: to },
          },
        },
      }),
    ]);

    const deliveryIds = new Set(deliveries.map((delivery) => delivery.id));
    const scopedLines = lines.filter((line) => deliveryIds.has(line.deliveryId));
    const lotIds = [...new Set(scopedLines.map((line) => line.stockLotId))];
    const [lots, units] = await this.prisma.$transaction([
      this.prisma.stockLot.findMany({ where: { id: { in: lotIds } } }),
      this.prisma.unit.findMany({}),
    ]);
    const itemIds = [...new Set(lots.map((lot) => lot.itemId))];
    const items = await this.prisma.item.findMany({ where: { id: { in: itemIds } } });
    const itemById = new Map(items.map((item) => [item.id, item]));
    const lotById = new Map(lots.map((lot) => [lot.id, lot]));
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const linesByDelivery = new Map<string, typeof scopedLines>();
    for (const line of scopedLines) {
      const bucket = linesByDelivery.get(line.deliveryId) ?? [];
      bucket.push(line);
      linesByDelivery.set(line.deliveryId, bucket);
    }

    const familyIds = [...new Set(deliveries.map((delivery) => delivery.familyId))];
    const families = await this.prisma.family.findMany({ where: { id: { in: familyIds } } });
    const familyById = new Map(families.map((family) => [family.id, family]));

    const rows: DeliveryReportRow[] = [];
    let maxRevision: string | null = null;
    for (const delivery of deliveries) {
      maxRevision = maxInstant(maxRevision, delivery.updatedAt);
      if (delivery.reversal) maxRevision = maxInstant(maxRevision, delivery.reversal.updatedAt);
      rows.push({
        deliveryId: delivery.id,
        familyId: delivery.familyId,
        familyCode: familyById.get(delivery.familyId)?.code ?? null,
        occurredAt: toISODate(delivery.occurredAt),
        status: delivery.status as DeliveryStatusFilter,
        eligibilityStatus: delivery.eligibilityStatus,
        executorName: delivery.executorName,
        lines: (linesByDelivery.get(delivery.id) ?? []).map((line) => {
          const lot = lotById.get(line.stockLotId);
          const item = lot ? itemById.get(lot.itemId) : undefined;
          maxRevision = maxInstant(maxRevision, line.updatedAt);
          return {
            lineId: line.id,
            stockLotId: line.stockLotId,
            itemId: item?.id ?? "unknown",
            itemName: item?.name ?? "unknown",
            unitId: line.unitId,
            unitSymbol: unitById.get(line.unitId)?.symbol ?? "?",
            quantity: Number(line.quantity),
          };
        }),
        updatedAt: toISOInstant(delivery.updatedAt),
      });
    }

    return {
      deliveries: rows,
      maxRevision: maxRevision ?? `${filters.to}T23:59:59.999Z`,
    };
  }
}
