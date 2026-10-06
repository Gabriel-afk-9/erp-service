import { get, patch, post } from "../../../../shared/application/api-client";
import { parseApiError as readApiError } from "../../../../shared/application/api-error.js";

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
  cancelReason: string | null;
  status: "COMPLETED" | "CANCELED";
  revision: number;
  hasHomeVisit: boolean;
  homeVisit: HomeVisitData | null;
}

export interface RegisterServiceRecordInput {
  activityId: string;
  familyId: string;
  personId: string | null;
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

export async function listServiceRecords(familyId: string, params?: { from?: string; to?: string }): Promise<ServiceRecordItem[]> {
  const qs = new URLSearchParams({ familyId });
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const result = (await get(`/service-records?${qs.toString()}`)) as Envelope;
  const records = (result.data as { records?: ServiceRecordItem[] } | undefined)?.records;
  if (!Array.isArray(records)) {
    throw new Error(readApiError(result));
  }
  return records;
}

export async function registerServiceRecord(input: RegisterServiceRecordInput): Promise<ServiceRecordItem> {
  const result = (await post("/service-records", input)) as Envelope;
  const record = result.data as ServiceRecordItem | undefined;
  if (!record || typeof record.serviceRecordId !== "string") {
    throw new Error(readApiError(result));
  }
  return record;
}

export async function getServiceRecord(serviceRecordId: string): Promise<ServiceRecordItem> {
  const result = (await get(`/service-records/${encodeURIComponent(serviceRecordId)}`)) as Envelope;
  const record = result.data as ServiceRecordItem | undefined;
  if (!record || typeof record.serviceRecordId !== "string") {
    throw new Error(readApiError(result));
  }
  return record;
}

export async function correctServiceRecordNote(
  serviceRecordId: string,
  input: { newNote: string; reason: string; expectedRevision: number },
): Promise<void> {
  const result = (await patch(`/service-records/${encodeURIComponent(serviceRecordId)}/note`, input)) as Envelope;
  if (result.data === undefined) {
    throw new Error(readApiError(result));
  }
}

export interface ActivityOption {
  activityId: string;
  name: string;
  serviceTypeName: string;
  serviceTypeCode: string;
}

// Shows "Name (Type)" only when they differ; otherwise the bare name.
export function formatActivityLabel(activity: { name: string; serviceTypeName: string }): string {
  if (activity.name.trim() === activity.serviceTypeName.trim()) return activity.name;
  return `${activity.name} (${activity.serviceTypeName})`;
}

export async function listActivities(): Promise<ActivityOption[]> {
  const result = (await get("/activities?nature=ONE_OFF")) as Envelope;
  const data = result.data as { activities?: { activityId: string; name: string; serviceType: { code: string; name: string } }[] } | undefined;
  if (!data || !Array.isArray(data.activities)) {
    throw new Error(readApiError(result));
  }
  return data.activities.map((activity) => ({ activityId: activity.activityId, name: activity.name, serviceTypeName: activity.serviceType.name, serviceTypeCode: activity.serviceType.code }));
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
