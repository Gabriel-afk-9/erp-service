import type {
  DeliveryReportFilters,
  DeliveryReportRow,
  ReportRepository,
  StockMovementRow,
  StockReportFilters,
} from "../../domain/repositories/report.repository.js";

export function stockRow(partial: Partial<StockMovementRow> & { movementId: string }): StockMovementRow {
  return {
    balanceDelta: 0,
    categoryId: "cat-1",
    categoryName: "Alimentos",
    itemId: "item-1",
    itemName: "Arroz",
    lotId: "lot-1",
    occurredAt: "2026-03-10",
    quantity: 0,
    reason: null,
    recordedBy: "op",
    type: "DONATION_IN",
    unitId: "unit-1",
    unitSymbol: "KG",
    updatedAt: "2026-03-10T10:00:00.000Z",
    ...partial,
  };
}

export function deliveryRow(partial: Partial<DeliveryReportRow> & { deliveryId: string }): DeliveryReportRow {
  return {
    eligibilityStatus: "PENDING",
    executorName: "Joana",
    familyCode: "FAM-001",
    familyId: "fam-1",
    lines: [],
    occurredAt: "2026-04-05",
    status: "COMPLETED",
    updatedAt: "2026-04-05T10:00:00.000Z",
    ...partial,
  };
}

export class FakeReportRepository implements ReportRepository {
  stockMovements: StockMovementRow[] = [];
  stockOpening = 0;
  deliveries: DeliveryReportRow[] = [];

  async readStockSnapshot(filters: StockReportFilters) {
    const movements = this.stockMovements.filter(
      (movement) =>
        movement.occurredAt >= filters.from &&
        movement.occurredAt <= filters.to &&
        (filters.itemId === undefined || movement.itemId === filters.itemId) &&
        (filters.categoryId === undefined || movement.categoryId === filters.categoryId) &&
        (filters.movementType === undefined || movement.type === filters.movementType),
    );
    const maxRevision = movements.reduce<string | null>(
      (max, movement) => (max === null || movement.updatedAt > max ? movement.updatedAt : max),
      null,
    );
    return {
      maxRevision: maxRevision ?? `${filters.to}T23:59:59.999Z`,
      movements,
      openingBalance: this.stockOpening,
    };
  }

  async readDeliverySnapshot(filters: DeliveryReportFilters) {
    const deliveries = this.deliveries.filter(
      (delivery) =>
        delivery.occurredAt >= filters.from &&
        delivery.occurredAt <= filters.to &&
        (filters.familyId === undefined || delivery.familyId === filters.familyId) &&
        (filters.status === undefined || delivery.status === filters.status),
    );
    const maxRevision = deliveries.reduce<string | null>(
      (max, delivery) => (max === null || delivery.updatedAt > max ? delivery.updatedAt : max),
      null,
    );
    return {
      deliveries,
      maxRevision: maxRevision ?? `${filters.to}T23:59:59.999Z`,
    };
  }
}
