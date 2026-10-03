export interface RegisterServiceRecordInput {
  activityId: string;
  familyId: string;
  personId: string | null;
  occurredAt: string;
  executorName: string;
  executorRole: string;
  note: string | null;
  homeVisit: { observedSituation: string } | null;
  recordedBy: string;
}
