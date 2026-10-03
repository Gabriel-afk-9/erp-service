export interface RegisterServiceRecordOutput {
  serviceRecordId: string;
  occurredAt: string;
  recordedAt: string;
  familyId: string;
  personId: string | null;
  serviceTypeName: string;
  executorName: string;
  status: "COMPLETED";
  hasHomeVisit: boolean;
}
