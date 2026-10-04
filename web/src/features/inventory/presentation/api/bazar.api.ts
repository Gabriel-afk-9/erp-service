import { get, post } from "../../../../shared/application/api-client";

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

export interface BazarTransferItem {
  transferId: string;
  externalReference: string;
  receiptId: string;
}

export async function listBazarTransfers(): Promise<{ transfers: BazarTransferItem[] }> {
  const result = (await get("/inventory/bazar-transfers")) as Envelope;
  const data = result.data as { transfers?: BazarTransferItem[] } | undefined;
  if (!data || !Array.isArray(data.transfers)) throw new Error(readApiError(result));
  return { transfers: data.transfers };
}

export async function registerBazarTransfer(input: {
  externalReference: string;
  donorName?: string;
  receivedAt: string;
  operationKey: string;
  lines: { itemId: string; informedQuantity: number; receivedQuantity: number; acceptedQuantity: number; rejectedQuantity: number; rejectionReason?: string }[];
}): Promise<{ transferId: string; receiptId: string; duplicate: boolean }> {
  const result = (await post("/inventory/bazar-transfers", input)) as Envelope;
  const data = result.data as { transferId?: string; receiptId?: string; duplicate?: boolean } | undefined;
  if (!data || typeof data.transferId !== "string") throw new Error(readApiError(result));
  return data as { transferId: string; receiptId: string; duplicate: boolean };
}
