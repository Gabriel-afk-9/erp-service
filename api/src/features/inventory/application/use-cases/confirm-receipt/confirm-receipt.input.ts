export interface ConfirmReceiptLineInput {
  itemId: string;
  informedQuantity?: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  expiresOn?: string | null;
}

export interface ConfirmReceiptInput {
  originType: "PERSON" | "ORGANIZATION" | "CAMPAIGN" | "AD_HOC" | "UNKNOWN";
  donorName?: string | null;
  receivedAt: string;
  note?: string | null;
  operationKey: string;
  actorId: string;
  lines: ConfirmReceiptLineInput[];
}
