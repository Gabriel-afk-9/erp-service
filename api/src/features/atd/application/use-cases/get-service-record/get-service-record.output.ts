import type { ServiceRecordStatus } from "../../../domain/entities/service-record.entity.js";

export interface ServiceRecordHomeVisitOutput {
  observedSituation: string;
}

export interface GetServiceRecordOutput {
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
  status: ServiceRecordStatus;
  revision: number;
  homeVisit: ServiceRecordHomeVisitOutput | null;
}
