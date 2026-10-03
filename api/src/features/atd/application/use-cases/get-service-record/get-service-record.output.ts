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
  status: "COMPLETED" | "CANCELED";
  revision: number;
  homeVisit: ServiceRecordHomeVisitOutput | null;
}
