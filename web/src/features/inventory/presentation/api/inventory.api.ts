import { get, patch, post } from "../../../../shared/application/api-client";
import { parseApiError as readApiError } from "../../../../shared/application/api-error.js";

interface Envelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export interface CategoryItem {
  categoryId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  revision: number;
}

export interface UnitItem {
  unitId: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
  quantityIncrement: number;
  isActive: boolean;
}

export interface InventoryItem {
  itemId: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitSymbol: string;
  requiresExpiration: boolean;
  isActive: boolean;
  revision: number;
}

export async function listCategories(params: { q?: string; onlyActive?: boolean }): Promise<{ categories: CategoryItem[] }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.onlyActive !== undefined) qs.set("onlyActive", String(params.onlyActive));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/inventory/categories${suffix}`)) as Envelope;
  const data = result.data as { categories?: CategoryItem[] } | undefined;
  if (!data || !Array.isArray(data.categories)) throw new Error(readApiError(result));
  return { categories: data.categories };
}

export async function createCategory(input: { name: string; description?: string }): Promise<{ categoryId: string }> {
  const result = (await post("/inventory/categories", input)) as Envelope;
  const data = result.data as { categoryId?: string } | undefined;
  if (!data || typeof data.categoryId !== "string") throw new Error(readApiError(result));
  return data as { categoryId: string };
}

export async function getCategory(categoryId: string): Promise<CategoryItem & { items: { itemId: string; name: string; unitSymbol: string; requiresExpiration: boolean; isActive: boolean }[] }> {
  const result = (await get(`/inventory/categories/${encodeURIComponent(categoryId)}`)) as Envelope;
  const data = result.data as (CategoryItem & { items?: { itemId: string; name: string; unitSymbol: string; requiresExpiration: boolean; isActive: boolean }[] }) | undefined;
  if (!data || typeof data.categoryId !== "string") throw new Error(readApiError(result));
  return { ...data, items: data.items ?? [] };
}

export async function updateCategory(categoryId: string, input: { name?: string; description?: string | null; reason: string; expectedRevision: number }): Promise<void> {
  const result = (await patch(`/inventory/categories/${encodeURIComponent(categoryId)}`, input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}

export async function deactivateCategory(categoryId: string, input: { reason: string; expectedRevision: number }): Promise<void> {
  const result = (await post(`/inventory/categories/${encodeURIComponent(categoryId)}/deactivation`, input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}

export async function listUnits(params: { onlyActive?: boolean }): Promise<{ units: UnitItem[] }> {
  const qs = new URLSearchParams();
  if (params.onlyActive !== undefined) qs.set("onlyActive", String(params.onlyActive));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/inventory/units${suffix}`)) as Envelope;
  const data = result.data as { units?: UnitItem[] } | undefined;
  if (!data || !Array.isArray(data.units)) throw new Error(readApiError(result));
  return { units: data.units };
}

export async function createUnit(input: { symbol: string; name: string; decimalPlaces: number; quantityIncrement: number }): Promise<{ unitId: string }> {
  const result = (await post("/inventory/units", input)) as Envelope;
  const data = result.data as { unitId?: string } | undefined;
  if (!data || typeof data.unitId !== "string") throw new Error(readApiError(result));
  return data as { unitId: string };
}

export interface ItemBalanceLot {
  lotId: string;
  expiresOn: string | null;
  onHand: number;
  status: "AVAILABLE" | "EXPIRED" | "EMPTY";
}

export async function getItemBalance(itemId: string): Promise<{ onHand: number; available: number; lots: ItemBalanceLot[] }> {
  const result = (await get(`/inventory/items/${encodeURIComponent(itemId)}/balance`)) as Envelope;
  const data = result.data as { onHand?: number; available?: number; lots?: ItemBalanceLot[] } | undefined;
  if (!data || typeof data.onHand !== "number" || !Array.isArray(data.lots)) throw new Error(readApiError(result));
  return { onHand: data.onHand, available: data.available ?? 0, lots: data.lots };
}

export async function listItems(params: { q?: string; categoryId?: string; onlyActive?: boolean }): Promise<{ items: InventoryItem[] }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.onlyActive !== undefined) qs.set("onlyActive", String(params.onlyActive));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/inventory/items${suffix}`)) as Envelope;
  const data = result.data as { items?: InventoryItem[] } | undefined;
  if (!data || !Array.isArray(data.items)) throw new Error(readApiError(result));
  return { items: data.items };
}

export async function createItem(input: { categoryId: string; unitId: string; name: string; description?: string; requiresExpiration: boolean }): Promise<{ itemId: string }> {
  const result = (await post("/inventory/items", input)) as Envelope;
  const data = result.data as { itemId?: string } | undefined;
  if (!data || typeof data.itemId !== "string") throw new Error(readApiError(result));
  return data as { itemId: string };
}

export async function updateItem(itemId: string, input: { name?: string; description?: string | null; requiresExpiration?: boolean; reason: string; expectedRevision: number }): Promise<void> {
  const result = (await patch(`/inventory/items/${encodeURIComponent(itemId)}`, input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}

export async function getItem(itemId: string): Promise<{ itemId: string; name: string; unitId: string; unitSymbol: string; requiresExpiration: boolean }> {
  const result = (await get(`/inventory/items/${encodeURIComponent(itemId)}`)) as Envelope;
  const data = result.data as { itemId?: string; name?: string; unit?: { unitId?: string; symbol?: string }; requiresExpiration?: boolean } | undefined;
  if (!data || typeof data.itemId !== "string" || typeof data.name !== "string") throw new Error(readApiError(result));
  return { itemId: data.itemId, name: data.name, unitId: data.unit?.unitId ?? "", unitSymbol: data.unit?.symbol ?? "", requiresExpiration: data.requiresExpiration ?? false };
}

export async function deactivateItem(itemId: string, input: { reason: string; expectedRevision: number }): Promise<void> {
  const result = (await post(`/inventory/items/${encodeURIComponent(itemId)}/deactivation`, input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}

export interface ReceiptLineDetail {
  lineId: string;
  itemId: string;
  itemName: string;
  unitSymbol: string;
  informedQuantity: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason: string | null;
  expiresOn: string | null;
  lotId: string | null;
}

export interface ReceiptDetail {
  receiptId: string;
  originType: string;
  donorName: string | null;
  receivedBy: string;
  receivedAt: string;
  note: string | null;
  lines: ReceiptLineDetail[];
}

export interface ReceiptListItem {
  receiptId: string;
  originType: string;
  donorName: string | null;
  receivedAt: string;
}

export async function listReceipts(params: { from?: string; to?: string; originType?: string }): Promise<{ receipts: ReceiptListItem[] }> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.originType) qs.set("originType", params.originType);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/inventory/receipts${suffix}`)) as Envelope;
  const data = result.data as { receipts?: ReceiptListItem[] } | undefined;
  if (!data || !Array.isArray(data.receipts)) throw new Error(readApiError(result));
  return { receipts: data.receipts };
}

export async function getReceipt(receiptId: string): Promise<ReceiptDetail> {
  const result = (await get(`/inventory/receipts/${encodeURIComponent(receiptId)}`)) as Envelope;
  const data = result.data as ReceiptDetail | undefined;
  if (!data || typeof data.receiptId !== "string") throw new Error(readApiError(result));
  return data;
}

export async function confirmReceipt(input: {
  originType: string;
  donorName?: string | null;
  receivedAt: string;
  note?: string | null;
  operationKey: string;
  lines: { itemId: string; informedQuantity?: number | null; receivedQuantity: number; acceptedQuantity: number; rejectedQuantity: number; rejectionReason?: string | null; expiresOn?: string | null }[];
}): Promise<{ receiptId: string }> {
  const result = (await post("/inventory/receipts", input)) as Envelope;
  const data = result.data as { receiptId?: string } | undefined;
  if (!data || typeof data.receiptId !== "string") throw new Error(readApiError(result));
  return { receiptId: data.receiptId };
}

export interface BalanceRow {
  itemId: string;
  name: string;
  categoryName: string;
  unitSymbol: string;
  requiresExpiration: boolean;
  isActive: boolean;
  onHand: number;
  available: number;
}

export async function listBalances(params: { q?: string; categoryId?: string; referenceDate?: string }): Promise<{ items: BalanceRow[] }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.referenceDate) qs.set("referenceDate", params.referenceDate);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/inventory/balance${suffix}`)) as Envelope;
  const data = result.data as { items?: BalanceRow[] } | undefined;
  if (!data || !Array.isArray(data.items)) throw new Error(readApiError(result));
  return { items: data.items };
}

export async function adjustStock(input: { itemId: string; lotId?: string | null; quantity: number; direction: "IN" | "OUT"; reason: string; operationKey: string }): Promise<void> {
  const result = (await post("/inventory/adjustments", input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}

export interface ItemMovementRow {
  movementId: string;
  type: string;
  quantity: number;
  balanceDelta: number;
  balanceAfter: number;
  occurredAt: string;
  lotId: string | null;
}

export async function getItemMovements(itemId: string, to?: string): Promise<{ itemId: string; movements: ItemMovementRow[] }> {
  const suffix = to ? `?to=${encodeURIComponent(to)}` : "";
  const result = (await get(`/inventory/items/${encodeURIComponent(itemId)}/movements${suffix}`)) as Envelope;
  const data = result.data as { itemId?: string; movements?: ItemMovementRow[] } | undefined;
  if (!data || !Array.isArray(data.movements)) throw new Error(readApiError(result));
  return { itemId: data.itemId ?? itemId, movements: data.movements };
}

export interface BazarTransferLineDetail {
  lineId: string;
  itemId: string;
  itemName: string;
  informedQuantity: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  divergence: number | null;
  lotId: string | null;
}

export interface BazarTransferDetail {
  transferId: string;
  externalReference: string;
  receiptId: string;
  receivedAt: string;
  donorName: string | null;
  lines: BazarTransferLineDetail[];
}

export async function getBazarTransfer(transferId: string): Promise<BazarTransferDetail> {
  const result = (await get(`/inventory/bazar-transfers/${encodeURIComponent(transferId)}`)) as Envelope;
  const data = result.data as BazarTransferDetail | undefined;
  if (!data || typeof data.transferId !== "string") throw new Error(readApiError(result));
  return data;
}

export async function createStockCount(input: { conductedAt?: string; note?: string | null }): Promise<{ countId: string; lineCount: number }> {
  const result = (await post("/inventory/counts", input)) as Envelope;
  const data = result.data as { countId?: string; lineCount?: number } | undefined;
  if (!data || typeof data.countId !== "string") throw new Error(readApiError(result));
  return { countId: data.countId, lineCount: data.lineCount ?? 0 };
}

export async function recordCountLine(countId: string, input: { lotId?: string | null; itemId?: string; unitId?: string; expiresOn?: string | null; countedQuantity: number }): Promise<{ lineId: string; variance: number }> {
  const result = (await post(`/inventory/counts/${encodeURIComponent(countId)}/lines`, input)) as Envelope;
  const data = result.data as { lineId?: string; variance?: number } | undefined;
  if (!data || typeof data.lineId !== "string") throw new Error(readApiError(result));
  return { lineId: data.lineId, variance: data.variance ?? 0 };
}

export async function closeStockCount(countId: string, closedAt?: string): Promise<{ countId: string; adjustments: number }> {
  const result = (await post(`/inventory/counts/${encodeURIComponent(countId)}/closure`, closedAt ? { closedAt } : {})) as Envelope;
  const data = result.data as { countId?: string; adjustments?: number } | undefined;
  if (!data || typeof data.countId !== "string") throw new Error(readApiError(result));
  return { countId: data.countId, adjustments: data.adjustments ?? 0 };
}
