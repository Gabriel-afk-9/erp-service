import { get, post } from "../../../../shared/application/api-client";
import { parseApiError as readApiError } from "../../../../shared/application/api-error.js";

interface Envelope {
  data?: unknown;
  code?: string;
  message?: string;
}

export interface DeliveryListItem {
  deliveryId: string;
  familyId: string;
  occurredAt: string;
  status: string;
}

export async function previewDelivery(familyId: string, date?: string): Promise<{
  eligibilityStatus: string;
  pendingReason: string | null;
  justificationRequired: boolean;
  previousDeliveries: DeliveryListItem[];
}> {
  const qs = date ? `?familyId=${encodeURIComponent(familyId)}&date=${encodeURIComponent(date)}` : `?familyId=${encodeURIComponent(familyId)}`;
  const result = (await get(`/deliveries/preview${qs}`)) as Envelope;
  const data = result.data as {
    eligibilityStatus?: string;
    pendingReason?: string | null;
    justificationRequired?: boolean;
    previousDeliveries?: DeliveryListItem[];
  } | undefined;
  if (!data || typeof data.eligibilityStatus !== "string") throw new Error(readApiError(result));
  return {
    eligibilityStatus: data.eligibilityStatus,
    pendingReason: data.pendingReason ?? null,
    justificationRequired: data.justificationRequired ?? false,
    previousDeliveries: data.previousDeliveries ?? [],
  };
}

export async function listDeliveries(familyId?: string): Promise<{ deliveries: DeliveryListItem[] }> {
  const suffix = familyId ? `?familyId=${encodeURIComponent(familyId)}` : "";
  const result = (await get(`/deliveries${suffix}`)) as Envelope;
  const data = result.data as { deliveries?: DeliveryListItem[] } | undefined;
  if (!data || !Array.isArray(data.deliveries)) throw new Error(readApiError(result));
  return { deliveries: data.deliveries };
}

export interface DeliveryDetail {
  deliveryId: string;
  serviceRecordId: string;
  familyId: string;
  eligibilityStatus: string;
  occurredAt: string;
  collectedByPersonId: string | null;
  executorName: string;
  executorRole: string;
  exceptionReason: string | null;
  authorizedBy: string | null;
  status: string;
  reversal: { reversalId: string; reason: string } | null;
  lines: { lineId: string; stockLotId: string; quantity: number }[];
}

export async function getDelivery(deliveryId: string): Promise<DeliveryDetail> {
  const result = (await get(`/deliveries/${encodeURIComponent(deliveryId)}`)) as Envelope;
  const data = result.data as DeliveryDetail | undefined;
  if (!data || typeof data.deliveryId !== "string") throw new Error(readApiError(result));
  return data;
}

export async function confirmDelivery(input: {
  familyId: string;
  occurredAt: string;
  lines: { lotId: string; quantity: number }[];
  executorName: string;
  executorRole: string;
  exceptionReason?: string;
  authorizedBy?: string;
  operationKey: string;
}): Promise<{ deliveryId: string; duplicate: boolean }> {
  const result = (await post("/deliveries", input)) as Envelope;
  const data = result.data as { deliveryId?: string; duplicate?: boolean } | undefined;
  if (!data || typeof data.deliveryId !== "string") throw new Error(readApiError(result));
  return data as { deliveryId: string; duplicate: boolean };
}

export async function reverseDelivery(deliveryId: string, reason: string): Promise<{ reversalId: string; duplicate: boolean }> {
  const result = (await post(`/deliveries/${encodeURIComponent(deliveryId)}/reversal`, { reason })) as Envelope;
  const data = result.data as { reversalId?: string; duplicate?: boolean } | undefined;
  if (!data || typeof data.reversalId !== "string") throw new Error(readApiError(result));
  return data as { reversalId: string; duplicate: boolean };
}
