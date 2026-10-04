import { get, patch, post } from "../../../../shared/application/api-client";

interface Envelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export function readApiError(result: unknown): string {
  const envelope = result as Envelope;
  if (typeof envelope?.code === "string") {
    return envelope.message ? `${envelope.code}: ${envelope.message}` : envelope.code;
  }
  return "Erro inesperado";
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

export async function deactivateItem(itemId: string, input: { reason: string; expectedRevision: number }): Promise<void> {
  const result = (await post(`/inventory/items/${encodeURIComponent(itemId)}/deactivation`, input)) as Envelope;
  if (result.data === undefined && result.code) throw new Error(readApiError(result));
}
