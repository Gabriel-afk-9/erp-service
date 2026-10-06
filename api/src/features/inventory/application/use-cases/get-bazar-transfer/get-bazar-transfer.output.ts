export interface GetBazarTransferOutput {
  transferId: string;
  externalReference: string;
  receiptId: string;
  receivedAt: string;
  donorName: string | null;
  lines: Array<{
    lineId: string;
    itemId: string;
    itemName: string;
    informedQuantity: number | null;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    divergence: number | null;
    lotId: string | null;
  }>;
}
