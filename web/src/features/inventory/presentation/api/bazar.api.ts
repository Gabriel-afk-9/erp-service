import { get, post } from "../../../../shared/application/api-client";
import { parseApiError as readApiError } from "../../../../shared/application/api-error.js";

interface Envelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export interface BazarTransferItem {
  transferId: string;
  externalReference: string;
  receiptId: string;
}

export async function listBazarTransfers(params?: { from?: string; to?: string }): Promise<{ transfers: BazarTransferItem[] }> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const result = (await get(`/inventory/bazar-transfers${suffix}`)) as Envelope;
  const data = result.data as { transfers?: BazarTransferItem[] } | undefined;
  if (!data || !Array.isArray(data.transfers)) throw new Error(readApiError(result));
  return { transfers: data.transfers };
}

export async function registerBazarTransfer(input: {
  externalReference: string;
  donorName?: string | null;
  receivedAt: string;
  note?: string | null;
  operationKey: string;
  lines: { itemId: string; informedQuantity: number; receivedQuantity: number; acceptedQuantity: number; rejectedQuantity: number; rejectionReason?: string | null; expiresOn?: string | null }[];
}): Promise<{ transferId: string; receiptId: string; duplicate: boolean }> {
  const result = (await post("/inventory/bazar-transfers", input)) as Envelope;
  const data = result.data as { transferId?: string; receiptId?: string; duplicate?: boolean } | undefined;
  if (!data || typeof data.transferId !== "string") throw new Error(readApiError(result));
  return data as { transferId: string; receiptId: string; duplicate: boolean };
}
