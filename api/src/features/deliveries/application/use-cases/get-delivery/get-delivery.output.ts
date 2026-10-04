export interface GetDeliveryOutput {
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
  lines: Array<{ lineId: string; stockLotId: string; unitId: string; quantity: number }>;
}

