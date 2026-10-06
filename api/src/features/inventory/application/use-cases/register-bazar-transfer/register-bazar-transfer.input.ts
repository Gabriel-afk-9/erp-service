export interface BazarTransferLineInput {
  itemId: string;
  informedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string | null;
  expiresOn?: string | null;
}

export interface RegisterBazarTransferInput {
  externalReference: string;
  donorName?: string | null;
  receivedAt: string;
  note?: string | null;
  operationKey: string;
  actorId: string;
  lines: BazarTransferLineInput[];
}
