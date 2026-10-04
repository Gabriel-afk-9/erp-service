export interface ConfirmDeliveryLineInput {
  lotId: string;
  quantity: number;
}

export interface ConfirmDeliveryInput {
  familyId: string;
  occurredAt: string;
  lines: ConfirmDeliveryLineInput[];
  collectedByPersonId?: string | null;
  executorName: string;
  executorRole: string;
  exceptionReason?: string | null;
  authorizedBy?: string | null;
  operationKey: string;
  actorId: string;
}

