export interface CancelServiceRecordInput {
  serviceRecordId: string;
  reason: string;
  expectedRevision: number;
  performedBy: string;
}
