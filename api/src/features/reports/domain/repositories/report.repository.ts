export type MovementTypeFilter =
  | "DONATION_IN"
  | "BAZAR_IN"
  | "TRIAGE_DISCARD"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "OPENING_BALANCE"
  | "DELIVERY_OUT"
  | "DELIVERY_REVERSAL";

export type DeliveryStatusFilter = "COMPLETED" | "REVERSED";

export interface StockReportFilters {
  from: string;
  to: string;
  itemId?: string;
  categoryId?: string;
  movementType?: MovementTypeFilter;
}

export interface DeliveryReportFilters {
  from: string;
  to: string;
  familyId?: string;
  status?: DeliveryStatusFilter;
}

export interface StockMovementRow {
  movementId: string;
  itemId: string;
  itemName: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitSymbol: string;
  lotId: string | null;
  type: MovementTypeFilter;
  quantity: number;
  balanceDelta: number;
  occurredAt: string;
  recordedBy: string;
  reason: string | null;
  updatedAt: string;
}

export interface StockReportSnapshot {
  openingBalance: number;
  movements: StockMovementRow[];
  maxRevision: string;
}

export interface DeliveryReportLineRow {
  lineId: string;
  stockLotId: string;
  itemId: string;
  itemName: string;
  unitId: string;
  unitSymbol: string;
  quantity: number;
}

export interface DeliveryReportRow {
  deliveryId: string;
  familyId: string;
  familyCode: string | null;
  occurredAt: string;
  status: DeliveryStatusFilter;
  eligibilityStatus: string;
  executorName: string;
  lines: DeliveryReportLineRow[];
  updatedAt: string;
}

export interface DeliveryReportSnapshot {
  deliveries: DeliveryReportRow[];
  maxRevision: string;
}

export interface ReportRepository {
  readStockSnapshot(filters: StockReportFilters): Promise<StockReportSnapshot>;
  readDeliverySnapshot(filters: DeliveryReportFilters): Promise<DeliveryReportSnapshot>;
}
