import { get } from "../../../../shared/application/api-client";
import { parseApiError as readApiError } from "../../../../shared/application/api-error.js";

interface Envelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export interface StockMovementRow {
  movementId: string;
  itemName: string;
  categoryName: string;
  unitSymbol: string;
  type: string;
  quantity: number;
  occurredAt: string;
}

export interface StockReport {
  openingBalance: number;
  closingBalance: number;
  totalsByType: { type: string; inbound: number; outbound: number; net: number; count: number }[];
  totalsByItem: { itemId: string; itemName: string; unitSymbol: string; inbound: number; outbound: number; net: number }[];
  movements: StockMovementRow[];
  queryFingerprint: string;
  total?: number;
}

export interface DeliveryReportLine {
  itemName: string;
  unitSymbol: string;
  quantity: number;
}

export interface DeliveryReportRow {
  deliveryId: string;
  familyCode: string | null;
  occurredAt: string;
  status: string;
  eligibilityStatus: string;
  lines: DeliveryReportLine[];
}

export interface DeliveryReport {
  deliveryCount: number;
  familyCount: number;
  serviceRecordCount: number;
  totalsByItem: { itemId: string; itemName: string; unitSymbol: string; quantity: number; deliveryCount: number }[];
  deliveries: DeliveryReportRow[];
  queryFingerprint: string;
  total?: number;
}

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  return search.toString();
}

export async function fetchStockReport(params: Record<string, string | undefined>): Promise<StockReport> {
  const result = (await get(`/reports/stock-movements?${toQuery(params)}`)) as Envelope;
  const data = result.data as StockReport | undefined;
  if (!data || typeof data.queryFingerprint !== "string") throw new Error(readApiError(result));
  return data;
}

export async function fetchDeliveryReport(params: Record<string, string | undefined>): Promise<DeliveryReport> {
  const result = (await get(`/reports/deliveries?${toQuery(params)}`)) as Envelope;
  const data = result.data as DeliveryReport | undefined;
  if (!data || typeof data.queryFingerprint !== "string") throw new Error(readApiError(result));
  return data;
}

export async function fetchStockRecords(params: Record<string, string | undefined>): Promise<StockReport & { page: number; pageSize: number; total: number }> {
  const result = (await get(`/reports/stock-movements/records?${toQuery(params)}`)) as Envelope;
  const data = result.data as (StockReport & { page?: number; pageSize?: number; total?: number }) | undefined;
  if (!data || typeof data.queryFingerprint !== "string" || typeof data.total !== "number") throw new Error(readApiError(result));
  return data as StockReport & { page: number; pageSize: number; total: number };
}

export async function fetchDeliveryRecords(params: Record<string, string | undefined>): Promise<DeliveryReport & { page: number; pageSize: number; total: number }> {
  const result = (await get(`/reports/deliveries/records?${toQuery(params)}`)) as Envelope;
  const data = result.data as (DeliveryReport & { page?: number; pageSize?: number; total?: number }) | undefined;
  if (!data || typeof data.queryFingerprint !== "string" || typeof data.total !== "number") throw new Error(readApiError(result));
  return data as DeliveryReport & { page: number; pageSize: number; total: number };
}
