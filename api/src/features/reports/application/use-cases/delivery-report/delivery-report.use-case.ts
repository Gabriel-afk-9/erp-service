import { ReportInvalidPeriodError } from "../../../domain/errors/report-invalid-period.error.js";
import { ReportChangedError } from "../../../domain/errors/report-changed.error.js";
import type {
  DeliveryReportFilters,
  ReportRepository,
} from "../../../domain/repositories/report.repository.js";
import { normalizePagination, paginate } from "../../../domain/services/pagination.js";
import { computeQueryFingerprint, isCivilDate } from "../../services/query-fingerprint.js";

export interface DeliveryReportInput extends DeliveryReportFilters {
  page?: number;
  pageSize?: number;
  expectedQueryFingerprint?: string;
}

export interface ItemDeliveryTotal {
  itemId: string;
  itemName: string;
  unitSymbol: string;
  quantity: number;
  deliveryCount: number;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export class DeliveryReportUseCase {
  constructor(private readonly reports: ReportRepository) {}

  async execute(input: DeliveryReportInput) {
    if (!isCivilDate(input.from) || !isCivilDate(input.to) || input.from > input.to) {
      throw new ReportInvalidPeriodError(input.from, input.to);
    }
    const snapshot = await this.reports.readDeliverySnapshot({
      from: input.from,
      to: input.to,
      familyId: input.familyId,
      status: input.status,
    });

    const filters: Record<string, string | undefined> = {
      familyId: input.familyId,
      from: input.from,
      status: input.status,
      to: input.to,
    };
    // Fingerprint computed AFTER the snapshot read, from the state just read.
    const queryFingerprint = computeQueryFingerprint("deliveries", filters, snapshot.maxRevision);

    const completed = snapshot.deliveries.filter((delivery) => delivery.status === "COMPLETED");
    // Each COMPLETED delivery has exactly one ServiceRecord (created together
    // at confirmation, RN-19), so the service-record count in this query is the
    // completed delivery count. No separate ServiceRecord query is made.
    const serviceRecordCount = completed.length;

    const byItem = new Map<string, ItemDeliveryTotal & { deliveryIds: Set<string> }>();
    for (const delivery of snapshot.deliveries) {
      for (const line of delivery.lines) {
        const key = `${line.itemId}|${line.unitSymbol}`;
        const total = byItem.get(key) ?? {
          deliveryCount: 0,
          deliveryIds: new Set<string>(),
          itemId: line.itemId,
          itemName: line.itemName,
          quantity: 0,
          unitSymbol: line.unitSymbol,
        };
        total.quantity += line.quantity;
        total.deliveryIds.add(delivery.deliveryId);
        total.deliveryCount = total.deliveryIds.size;
        byItem.set(key, total);
      }
    }
    const totalsByItem: ItemDeliveryTotal[] = [...byItem.values()]
      .map((total) => ({
        deliveryCount: total.deliveryCount,
        itemId: total.itemId,
        itemName: total.itemName,
        quantity: round(total.quantity),
        unitSymbol: total.unitSymbol,
      }))
      .sort((a, b) => (a.itemName < b.itemName ? -1 : 1));

    const base = {
      deliveries: snapshot.deliveries,
      deliveryCount: snapshot.deliveries.length,
      familyCount: new Set(snapshot.deliveries.map((delivery) => delivery.familyId)).size,
      filters: { familyId: input.familyId ?? null, from: input.from, status: input.status ?? null, to: input.to },
      generatedAt: new Date().toISOString(),
      queryFingerprint,
      report: "deliveries",
      serviceRecordCount,
      totalsByItem,
      unit: "DELIVERY",
    };

    if (input.expectedQueryFingerprint === undefined) {
      return base;
    }
    if (input.expectedQueryFingerprint !== queryFingerprint) {
      throw new ReportChangedError();
    }
    const page = paginate(snapshot.deliveries, normalizePagination(input.page, input.pageSize));
    return { ...base, deliveries: page.items, page: page.page, pageSize: page.pageSize, total: page.total };
  }
}
