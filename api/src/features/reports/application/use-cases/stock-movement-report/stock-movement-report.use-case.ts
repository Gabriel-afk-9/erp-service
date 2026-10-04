import { ReportInvalidPeriodError } from "../../../domain/errors/report-invalid-period.error.js";
import { ReportChangedError } from "../../../domain/errors/report-changed.error.js";
import type {
  ReportRepository,
  StockMovementRow,
  StockReportFilters,
} from "../../../domain/repositories/report.repository.js";
import { normalizePagination, paginate } from "../../../domain/services/pagination.js";
import { computeQueryFingerprint, isCivilDate } from "../../services/query-fingerprint.js";

export interface StockMovementReportInput extends StockReportFilters {
  page?: number;
  pageSize?: number;
  expectedQueryFingerprint?: string;
}

export interface MovementTypeTotal {
  type: string;
  inbound: number;
  outbound: number;
  net: number;
  count: number;
}

export interface ItemMovementTotal {
  itemId: string;
  itemName: string;
  unitSymbol: string;
  inbound: number;
  outbound: number;
  net: number;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export class StockMovementReportUseCase {
  constructor(private readonly reports: ReportRepository) {}

  async execute(input: StockMovementReportInput) {
    if (!isCivilDate(input.from) || !isCivilDate(input.to) || input.from > input.to) {
      throw new ReportInvalidPeriodError(input.from, input.to);
    }
    const snapshot = await this.reports.readStockSnapshot({
      from: input.from,
      to: input.to,
      itemId: input.itemId,
      categoryId: input.categoryId,
      movementType: input.movementType,
    });

    const filters: Record<string, string | undefined> = {
      categoryId: input.categoryId,
      from: input.from,
      itemId: input.itemId,
      movementType: input.movementType,
      to: input.to,
    };
    // Fingerprint computed AFTER the snapshot read, from the state just read.
    const queryFingerprint = computeQueryFingerprint("stock-movements", filters, snapshot.maxRevision);

    const byType = new Map<string, MovementTypeTotal>();
    const byItem = new Map<string, ItemMovementTotal>();
    for (const movement of snapshot.movements) {
      const inbound = movement.balanceDelta > 0 ? movement.balanceDelta : 0;
      const outbound = movement.balanceDelta < 0 ? -movement.balanceDelta : 0;
      const typeTotal = byType.get(movement.type) ?? { count: 0, inbound: 0, outbound: 0, net: 0, type: movement.type };
      typeTotal.inbound += inbound;
      typeTotal.outbound += outbound;
      typeTotal.net += movement.balanceDelta;
      typeTotal.count += 1;
      byType.set(movement.type, typeTotal);
      const key = `${movement.itemId}|${movement.unitSymbol}`;
      const itemTotal = byItem.get(key) ?? {
        inbound: 0,
        itemId: movement.itemId,
        itemName: movement.itemName,
        net: 0,
        outbound: 0,
        unitSymbol: movement.unitSymbol,
      };
      itemTotal.inbound += inbound;
      itemTotal.outbound += outbound;
      itemTotal.net += movement.balanceDelta;
      byItem.set(key, itemTotal);
    }

    const totalsByType = [...byType.values()]
      .map((total) => ({ ...total, inbound: round(total.inbound), net: round(total.net), outbound: round(total.outbound) }))
      .sort((a, b) => (a.type < b.type ? -1 : 1));
    const totalsByItem = [...byItem.values()]
      .map((total) => ({ ...total, inbound: round(total.inbound), net: round(total.net), outbound: round(total.outbound) }))
      .sort((a, b) => (a.itemName < b.itemName ? -1 : 1));
    const closingBalance = round(snapshot.openingBalance + snapshot.movements.reduce((sum, movement) => sum + movement.balanceDelta, 0));

    const base = {
      closingBalance,
      filters: { categoryId: input.categoryId ?? null, from: input.from, itemId: input.itemId ?? null, movementType: input.movementType ?? null, to: input.to },
      generatedAt: new Date().toISOString(),
      openingBalance: round(snapshot.openingBalance),
      period: { from: input.from, to: input.to },
      queryFingerprint,
      report: "stock-movements",
      totalsByItem,
      totalsByType,
      unit: "MOVEMENT",
    };

    if (input.expectedQueryFingerprint === undefined) {
      return { ...base, movements: snapshot.movements as StockMovementRow[] };
    }
    if (input.expectedQueryFingerprint !== queryFingerprint) {
      throw new ReportChangedError();
    }
    const page = paginate(snapshot.movements, normalizePagination(input.page, input.pageSize));
    return { ...base, movements: page.items, page: page.page, pageSize: page.pageSize, total: page.total };
  }
}
