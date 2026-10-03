import { get, patch, post } from "../../../../shared/application/api-client";

export interface HomeVisitData {
  observedSituation: string;
}

export interface ServiceRecordItem {
  serviceRecordId: string;
  activityId: string;
  serviceTypeName: string;
  familyId: string;
  personId: string | null;
  executorName: string;
  executorRole: string;
  occurredAt: string;
  recordedAt: string;
  recordedBy: string;
  note: string | null;
  status: "COMPLETED" | "CANCELED";
  revision: number;
  hasHomeVisit: boolean;
  homeVisit: HomeVisitData | null;
}

export interface RegisterServiceRecordInput {
  activityId: string;
  familyId: string;
  occurredAt: string;
  executorName: string;
  executorRole: string;
  note: string | null;
  homeVisit: HomeVisitData | null;
}

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

export async function listServiceRecords(familyId: string): Promise<ServiceRecordItem[]> {
  const result = (await get(`/service-records?familyId=${encodeURIComponent(familyId)}`)) as Envelope;
  const records = (result.data as { records?: ServiceRecordItem[] } | undefined)?.records;
  if (!Array.isArray(records)) {
    throw new Error(readApiError(result));
  }
  return records;
}

export async function registerServiceRecord(input: RegisterServiceRecordInput): Promise<ServiceRecordItem> {
  const result = (await post("/service-records", { ...input, personId: null })) as Envelope;
  const record = result.data as ServiceRecordItem | undefined;
  if (!record || typeof record.serviceRecordId !== "string") {
    throw new Error(readApiError(result));
  }
  return record;
}

export async function cancelServiceRecord(
  serviceRecordId: string,
  reason: string,
  expectedRevision: number,
): Promise<void> {
  const result = (await patch(`/service-records/${encodeURIComponent(serviceRecordId)}/cancel`, {
    reason,
    expectedRevision,
  })) as Envelope;
  if (result.data === undefined) {
    throw new Error(readApiError(result));
  }
}
